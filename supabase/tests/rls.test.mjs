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

  -- Et minimalt Storage-skjema, nok til at bøtte og tilgangsregler for filer kan testes.
  create schema storage;
  create table storage.buckets (
    id text primary key, name text, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets(id),
    name text not null
  );
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
  $$;
  grant usage on schema storage to anon, authenticated, service_role;
  grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
  grant select on storage.buckets to anon, authenticated, service_role;
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

const HASH_1 = "a".repeat(64);

test("merkevarefiler: egne filer kan registreres, andres kan verken leses eller legges inn", async () => {
  await as("authenticated", USER_A, async () => {
    await db.query(
      `insert into public.brand_assets (org_id, kind, original_name, storage_path, mime_type, file_size, content_hash)
       values ($1::uuid, 'logo', 'logo.png', $1::text || '/logo.png', 'image/png', 10, $2)`, [orgA, HASH_1]);
    await assert.rejects(
      db.query(`insert into public.brand_assets (org_id, kind, original_name, storage_path, mime_type, file_size)
                values ($1::uuid, 'image', 'x.png', $1::text || '/x.png', 'image/png', 10)`, [orgB]),
      /row-level security/,
    );
  });
  await as("authenticated", USER_B, async () => {
    const rows = await db.query(`select id from public.brand_assets`);
    assert.equal(rows.rows.length, 0);
  });
});

test("merkevarefiler: samme fil kan ikke lastes opp to ganger hos samme bedrift", async () => {
  await as("authenticated", USER_A, async () => {
    await assert.rejects(
      db.query(`insert into public.brand_assets (org_id, kind, original_name, storage_path, mime_type, file_size, content_hash)
                values ($1::uuid, 'image', 'kopi.png', $1::text || '/kopi.png', 'image/png', 10, $2)`, [orgA, HASH_1]),
      /duplicate key|unique/,
    );
  });
  // En annen bedrift kan godt ha den samme filen.
  await as("authenticated", USER_B, async () => {
    await db.query(
      `insert into public.brand_assets (org_id, kind, original_name, storage_path, mime_type, file_size, content_hash)
       values ($1::uuid, 'image', 'samme.png', $1::text || '/samme.png', 'image/png', 10, $2)`, [orgB, HASH_1]);
  });
});

test("merkevarefiler: bare én hovedlogo per bedrift", async () => {
  await as("authenticated", USER_A, async () => {
    await db.query(`update public.brand_assets set is_primary = true where org_id = $1 and kind = 'logo'`, [orgA]);
    await db.query(
      `insert into public.brand_assets (org_id, kind, original_name, storage_path, mime_type, file_size)
       values ($1::uuid, 'logo', 'logo2.png', $1::text || '/logo2.png', 'image/png', 10)`, [orgA]);
    await assert.rejects(
      db.query(`update public.brand_assets set is_primary = true where org_id = $1 and original_name = 'logo2.png'`, [orgA]),
      /duplicate key|unique/,
    );
  });
});

test("lagringsbøtta: filer ligger i bedriftens egen mappe og er usynlige for andre", async () => {
  const bucket = await db.query(`select public, allowed_mime_types from storage.buckets where id = 'brand-assets'`);
  assert.equal(bucket.rows[0].public, false);
  assert.ok(!bucket.rows[0].allowed_mime_types.includes("application/octet-stream"));
  await as("authenticated", USER_A, async () => {
    await db.query(`insert into storage.objects (bucket_id, name) values ('brand-assets', $1 || '/fil.png')`, [orgA]);
    await assert.rejects(
      db.query(`insert into storage.objects (bucket_id, name) values ('brand-assets', $1 || '/fil.png')`, [orgB]),
      /row-level security/,
    );
    await assert.rejects(
      db.query(`insert into storage.objects (bucket_id, name) values ('brand-assets', 'uten-mappe.png')`),
      /row-level security/,
    );
  });
  await as("authenticated", USER_B, async () => {
    const files = await db.query(`select name from storage.objects`);
    assert.equal(files.rows.length, 0);
    const deleted = await db.query(`delete from storage.objects returning name`);
    assert.equal(deleted.rows.length, 0);
  });
});

test("merkevareanalyse og typografi er skilt mellom kunder", async () => {
  await as("authenticated", USER_A, async () => {
    await db.query(`insert into public.brand_analyses (org_id, analysis) values ($1, '{}'::jsonb)`, [orgA]);
    await db.query(`insert into public.brand_typography (org_id, settings) values ($1, '{}'::jsonb)`, [orgA]);
    await assert.rejects(
      db.query(`insert into public.brand_analyses (org_id, analysis) values ($1, '{}'::jsonb)`, [orgB]),
      /row-level security/,
    );
  });
  await as("authenticated", USER_B, async () => {
    assert.equal((await db.query(`select 1 from public.brand_analyses`)).rows.length, 0);
    assert.equal((await db.query(`select 1 from public.brand_typography`)).rows.length, 0);
  });
});

test("nye tabeller: uinnloggede får ingenting, og ingen kan tømme tabeller", async () => {
  await as("anon", null, async () => {
    for (const table of ["brand_assets", "brand_typography", "brand_service_requests", "brand_analyses"]) {
      await assert.rejects(db.query(`select * from public.${table}`), /permission denied/, table);
    }
  });
  await as("authenticated", USER_A, async () => {
    for (const table of ["brand_assets", "brand_typography", "brand_service_requests", "brand_analyses"]) {
      await assert.rejects(db.query(`truncate public.${table}`), /permission denied/, table);
    }
    await assert.rejects(db.query(`update public.brand_service_requests set status = 'completed'`), /permission denied/);
  });
});

test("AI-kvote: stopper etter grensen, og bare medlemmer kan bruke bedriftens kvote", async () => {
  await as("authenticated", USER_A, async () => {
    for (let i = 0; i < 5; i++) {
      const { rows } = await db.query(`select public.claim_ai_quota($1, 'brand_analysis') as q`, [orgA]);
      assert.equal(rows[0].q.allowed, true, `kall ${i + 1}`);
      assert.equal(rows[0].q.remaining, 4 - i);
    }
    const { rows } = await db.query(`select public.claim_ai_quota($1, 'brand_analysis') as q`, [orgA]);
    assert.equal(rows[0].q.allowed, false);
    assert.equal(rows[0].q.reason, "org");
    assert.ok(rows[0].q.retry_after_seconds >= 60);
    await assert.rejects(db.query(`select public.claim_ai_quota($1, 'brand_analysis')`, [orgB]), /Not a member/);
    await assert.rejects(db.query(`select public.claim_ai_quota($1, 'noe_annet')`, [orgA]), /Unknown quota type/);
    // Telleren kan ikke nullstilles fra nettleseren.
    await assert.rejects(db.query(`delete from public.ai_runs`), /permission denied/);
    await assert.rejects(db.query(`insert into public.ai_runs (org_id, type, model) values ($1, 'x', 'y')`, [orgA]), /permission denied/);
  });
  // Kvoten er per bedrift: B er ikke påvirket av at A har brukt opp sin.
  await as("authenticated", USER_B, async () => {
    const { rows } = await db.query(`select public.claim_ai_quota($1, 'brand_analysis') as q`, [orgB]);
    assert.equal(rows[0].q.allowed, true);
  });
  await as("anon", null, async () => {
    await assert.rejects(db.query(`select public.claim_ai_quota($1, 'assistant')`, [orgA]), /permission denied/);
  });
});
