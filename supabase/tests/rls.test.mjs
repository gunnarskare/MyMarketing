// Tester kundeskillet: kjører migrasjonene mot en Postgres i minnet (PGlite)
// og sjekker at to kunder ikke ser eller kan endre hverandres data.
// Kjør med: npm run test:rls
import { PGlite } from "@electric-sql/pglite";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");
const USER_A = "00000000-0000-0000-0000-00000000000a";
const USER_B = "00000000-0000-0000-0000-00000000000b";

// Det Supabase har fra før: roller, auth-skjema og auth.uid().
const supabaseStub = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth, public to anon, authenticated, service_role;
  -- Supabase har tradisjonelt gitt alle roller full tilgang som standard.
  -- Testen beholder det, så vi ser at migrasjonene selv strammer inn.
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

let db;
let orgA;
let orgB;

async function as(role, userId, fn) {
  await db.exec(`set role ${role}; set request.jwt.claim.sub = '${userId ?? ""}';`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; reset request.jwt.claim.sub;`);
  }
}

before(async () => {
  db = new PGlite();
  await db.exec(supabaseStub);
  for (const file of readdirSync(migrationsDir).sort()) {
    await db.exec(readFileSync(join(migrationsDir, file), "utf8"));
  }
  await db.exec(`insert into auth.users (id) values ('${USER_A}'), ('${USER_B}');`);
  orgA = await as("authenticated", USER_A, async () =>
    (await db.query(`select public.create_organization('Kunde A') as id`)).rows[0].id,
  );
  orgB = await as("authenticated", USER_B, async () =>
    (await db.query(`select public.create_organization('Kunde B') as id`)).rows[0].id,
  );
});

after(async () => {
  await db.close();
});

test("en bruker ser bare sin egen kunde", async () => {
  await as("authenticated", USER_A, async () => {
    const orgs = await db.query(`select id from public.organizations`);
    assert.deepEqual(orgs.rows.map((r) => r.id), [orgA]);
    const profiles = await db.query(`select org_id from public.brand_profiles`);
    assert.deepEqual(profiles.rows.map((r) => r.org_id), [orgA]);
    const members = await db.query(`select user_id from public.memberships`);
    assert.deepEqual(members.rows.map((r) => r.user_id), [USER_A]);
  });
});

test("en bruker kan endre egen merkevareprofil, men ikke en annens", async () => {
  await as("authenticated", USER_A, async () => {
    const own = await db.query(
      `update public.brand_profiles set tone = 'vennlig' where org_id = $1 returning id`, [orgA]);
    assert.equal(own.rows.length, 1);
    const other = await db.query(
      `update public.brand_profiles set tone = 'kapret' where org_id = $1 returning id`, [orgB]);
    assert.equal(other.rows.length, 0);
  });
  const untouched = await db.query(`select tone from public.brand_profiles where org_id = $1`, [orgB]);
  assert.equal(untouched.rows[0].tone, null);
});

test("en bruker kan ikke legge innhold inn hos en annen kunde", async () => {
  await as("authenticated", USER_A, async () => {
    await db.query(`insert into public.posts (org_id, base_text) values ($1, 'mitt')`, [orgA]);
    await assert.rejects(
      db.query(`insert into public.posts (org_id, base_text) values ($1, 'ikke mitt')`, [orgB]),
      /row-level security/,
    );
  });
  await as("authenticated", USER_B, async () => {
    const posts = await db.query(`select id from public.posts`);
    assert.equal(posts.rows.length, 0);
  });
});

test("en bruker kan ikke melde seg inn hos en annen kunde eller opprette kunder direkte", async () => {
  await as("authenticated", USER_A, async () => {
    await assert.rejects(
      db.query(`insert into public.memberships (org_id, user_id) values ($1, $2)`, [orgB, USER_A]),
      /permission denied/,
    );
    await assert.rejects(
      db.query(`insert into public.organizations (name) values ('snarvei')`),
      /permission denied/,
    );
  });
});

test("plattform-tokens kan ikke leses av innloggede brukere, bare av serveren", async () => {
  await as("service_role", null, async () => {
    await db.query(
      `with account as (
         insert into public.social_accounts (org_id, platform, external_id, name)
         values ($1, 'linkedin', 'ext-1', 'Kunde A på LinkedIn') returning id
       )
       insert into public.social_account_tokens (social_account_id, org_id, access_token_encrypted)
       select id, $1, 'hemmelig' from account`,
      [orgA],
    );
    const tokens = await db.query(`select 1 from public.social_account_tokens`);
    assert.equal(tokens.rows.length, 1);
  });
  await as("authenticated", USER_A, async () => {
    const accounts = await db.query(`select name from public.social_accounts`);
    assert.equal(accounts.rows.length, 1);
    await assert.rejects(db.query(`select * from public.social_account_tokens`), /permission denied/);
    await assert.rejects(
      db.query(`insert into public.social_accounts (org_id, platform, external_id, name)
                values ($1, 'facebook', 'ext-2', 'falsk')`, [orgA]),
      /permission denied/,
    );
  });
  await as("authenticated", USER_B, async () => {
    const accounts = await db.query(`select name from public.social_accounts`);
    assert.equal(accounts.rows.length, 0);
  });
});

test("uinnloggede får ingenting", async () => {
  await as("anon", null, async () => {
    await assert.rejects(db.query(`select * from public.organizations`), /permission denied/);
    await assert.rejects(db.query(`select * from public.brand_profiles`), /permission denied/);
    await assert.rejects(db.query(`select public.create_organization('anonym')`), /permission denied/);
    await assert.rejects(db.query(`select private.is_org_member($1)`, [orgA]), /permission denied/);
  });
});

test("kundenavn valideres", async () => {
  await as("authenticated", USER_A, async () => {
    await assert.rejects(db.query(`select public.create_organization('   ')`), /invalid organization name/);
  });
});
