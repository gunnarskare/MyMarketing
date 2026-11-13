-- MyMarketing: grunnskjema (fase 0)
-- Hver tabell bærer org_id, og radnivåsikkerhet (RLS) skiller kundene.

create extension if not exists pgcrypto;

-- ---------- Kunder og tilgang ----------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'pilot',
  created_at timestamptz not null default now()
);

create table memberships (
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- Brukes i alle RLS-regler. security definer for å unngå rekursjon mot memberships.
create or replace function is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from memberships
    where org_id = target_org and user_id = auth.uid()
  );
$$;

-- ---------- Merkevare ----------
create table brand_profiles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references organizations(id) on delete cascade,
  website_url text,
  tone text,
  audience text,
  products text,
  avoid text,
  language text not null default 'nb',
  updated_at timestamptz not null default now()
);

-- ---------- Tilkoblede kontoer ----------
create table social_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  platform text not null check (platform in ('facebook', 'instagram', 'linkedin')),
  external_id text not null,
  name text not null,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (org_id, platform, external_id)
);

-- Tokens ligger i egen tabell uten RLS-regler: bare serveren (service role) kan lese dem.
create table social_account_tokens (
  social_account_id uuid primary key references social_accounts(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  updated_at timestamptz not null default now()
);

-- ---------- Innhold ----------
create table content_plans (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  goals text,
  status text not null default 'draft' check (status in ('draft', 'approved', 'done')),
  created_at timestamptz not null default now()
);

create table media_assets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  storage_path text not null,
  type text not null default 'image' check (type in ('image')),
  source text not null check (source in ('upload', 'ai')),
  prompt text,
  created_at timestamptz not null default now()
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  plan_id uuid references content_plans(id) on delete set null,
  topic text,
  base_text text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'scheduled', 'published', 'failed')),
  scheduled_at timestamptz,
  created_by text not null default 'ai' check (created_by in ('ai', 'human')),
  created_at timestamptz not null default now()
);

create table post_variants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  post_id uuid not null references posts(id) on delete cascade,
  social_account_id uuid not null references social_accounts(id) on delete cascade,
  text text not null default '',
  media_ids uuid[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'scheduled', 'published', 'failed')),
  external_post_id text,
  published_at timestamptz,
  error text,
  unique (post_id, social_account_id)
);

-- ---------- Publiseringskø ----------
-- variant_id er unik: én jobb per variant, så nye forsøk aldri gir dobbelt innlegg.
create table publish_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  variant_id uuid not null unique references post_variants(id) on delete cascade,
  run_at timestamptz not null,
  attempts int not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'done', 'failed')),
  last_error text,
  locked_at timestamptz
);
create index publish_jobs_due on publish_jobs (run_at) where status = 'pending';

-- ---------- Tall og kostnad ----------
create table post_metrics (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  variant_id uuid not null references post_variants(id) on delete cascade,
  fetched_at timestamptz not null default now(),
  impressions int,
  reactions int,
  comments int,
  clicks int
);

create table ai_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  type text not null,
  model text not null,
  tokens int not null default 0,
  cost numeric(10, 4) not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Radnivåsikkerhet ----------
alter table organizations enable row level security;
alter table memberships enable row level security;
alter table brand_profiles enable row level security;
alter table social_accounts enable row level security;
alter table social_account_tokens enable row level security; -- ingen regler: kun service role
alter table content_plans enable row level security;
alter table media_assets enable row level security;
alter table posts enable row level security;
alter table post_variants enable row level security;
alter table publish_jobs enable row level security;
alter table post_metrics enable row level security;
alter table ai_runs enable row level security;

create policy org_read on organizations for select using (is_org_member(id));
create policy membership_read on memberships for select using (user_id = auth.uid());

-- Medlemmer kan lese og endre innholdet til egen kunde.
create policy member_all on brand_profiles for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy member_all on content_plans for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy member_all on media_assets for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy member_all on posts for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy member_all on post_variants for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));

-- Disse skrives bare av serveren. Medlemmer kan lese.
create policy member_read on social_accounts for select using (is_org_member(org_id));
create policy member_read on publish_jobs for select using (is_org_member(org_id));
create policy member_read on post_metrics for select using (is_org_member(org_id));
create policy member_read on ai_runs for select using (is_org_member(org_id));
