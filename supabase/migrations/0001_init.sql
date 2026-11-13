-- MyMarketing: grunnskjema (fase 0)
-- Hver tabell bærer org_id, og radnivåsikkerhet (RLS) skiller kundene.

-- ---------- Kunder og tilgang ----------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'pilot',
  created_at timestamptz not null default now()
);

create table public.memberships (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index memberships_user_id on public.memberships (user_id);

-- Brukes i alle RLS-regler. security definer for å unngå rekursjon mot memberships.
create function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships
    where org_id = target_org and user_id = (select auth.uid())
  );
$$;
revoke execute on function public.is_org_member(uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated, service_role;

-- ---------- Merkevare ----------
create table public.brand_profiles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references public.organizations(id) on delete cascade,
  website_url text,
  tone text,
  audience text,
  products text,
  avoid text,
  language text not null default 'nb',
  updated_at timestamptz not null default now()
);

-- ---------- Tilkoblede kontoer ----------
create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  platform text not null check (platform in ('facebook', 'instagram', 'linkedin')),
  external_id text not null,
  name text not null,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (org_id, platform, external_id)
);

-- Tokens ligger i egen tabell uten RLS-regler og uten tilgang for innloggede brukere:
-- bare serveren (service role) kan lese dem.
create table public.social_account_tokens (
  social_account_id uuid primary key references public.social_accounts(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  updated_at timestamptz not null default now()
);
create index social_account_tokens_org_id on public.social_account_tokens (org_id);

-- ---------- Innhold ----------
create table public.content_plans (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  goals text,
  status text not null default 'draft' check (status in ('draft', 'approved', 'done')),
  created_at timestamptz not null default now()
);
create index content_plans_org_id on public.content_plans (org_id);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  storage_path text not null,
  type text not null default 'image' check (type in ('image')),
  source text not null check (source in ('upload', 'ai')),
  prompt text,
  created_at timestamptz not null default now()
);
create index media_assets_org_id on public.media_assets (org_id);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  plan_id uuid references public.content_plans(id) on delete set null,
  topic text,
  base_text text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'scheduled', 'published', 'failed')),
  scheduled_at timestamptz,
  created_by text not null default 'ai' check (created_by in ('ai', 'human')),
  created_at timestamptz not null default now()
);
create index posts_org_id on public.posts (org_id);
create index posts_plan_id on public.posts (plan_id);

create table public.post_variants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  social_account_id uuid not null references public.social_accounts(id) on delete cascade,
  text text not null default '',
  media_ids uuid[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'scheduled', 'published', 'failed')),
  external_post_id text,
  published_at timestamptz,
  error text,
  unique (post_id, social_account_id)
);
create index post_variants_org_id on public.post_variants (org_id);
create index post_variants_social_account_id on public.post_variants (social_account_id);

-- ---------- Publiseringskø ----------
-- variant_id er unik: én jobb per variant, så nye forsøk aldri gir dobbelt innlegg.
create table public.publish_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  variant_id uuid not null unique references public.post_variants(id) on delete cascade,
  run_at timestamptz not null,
  attempts int not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'done', 'failed')),
  last_error text,
  locked_at timestamptz
);
create index publish_jobs_org_id on public.publish_jobs (org_id);
create index publish_jobs_due on public.publish_jobs (run_at) where status = 'pending';

-- ---------- Tall og kostnad ----------
create table public.post_metrics (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  variant_id uuid not null references public.post_variants(id) on delete cascade,
  fetched_at timestamptz not null default now(),
  impressions int,
  reactions int,
  comments int,
  clicks int
);
create index post_metrics_org_id on public.post_metrics (org_id);
create index post_metrics_variant_id on public.post_metrics (variant_id);

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  type text not null,
  model text not null,
  tokens int not null default 0,
  cost numeric(10, 4) not null default 0,
  created_at timestamptz not null default now()
);
create index ai_runs_org_id on public.ai_runs (org_id);

-- ---------- Tilganger ----------
-- Innloggede brukere får bare det de trenger. Uinnloggede (anon) får ingenting.
-- social_account_tokens er med vilje ikke med her.
revoke all on
  public.organizations, public.memberships, public.brand_profiles, public.social_accounts,
  public.social_account_tokens, public.content_plans, public.media_assets, public.posts,
  public.post_variants, public.publish_jobs, public.post_metrics, public.ai_runs
from anon, authenticated;

grant select on
  public.organizations, public.memberships, public.social_accounts,
  public.publish_jobs, public.post_metrics, public.ai_runs
to authenticated;

grant select, insert, update on public.brand_profiles to authenticated;

grant select, insert, update, delete on
  public.content_plans, public.media_assets, public.posts, public.post_variants
to authenticated;

grant all on
  public.organizations, public.memberships, public.brand_profiles, public.social_accounts,
  public.social_account_tokens, public.content_plans, public.media_assets, public.posts,
  public.post_variants, public.publish_jobs, public.post_metrics, public.ai_runs
to service_role;

-- ---------- Radnivåsikkerhet ----------
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.brand_profiles enable row level security;
alter table public.social_accounts enable row level security;
alter table public.social_account_tokens enable row level security; -- ingen regler: kun service role
alter table public.content_plans enable row level security;
alter table public.media_assets enable row level security;
alter table public.posts enable row level security;
alter table public.post_variants enable row level security;
alter table public.publish_jobs enable row level security;
alter table public.post_metrics enable row level security;
alter table public.ai_runs enable row level security;

create policy org_read on public.organizations for select to authenticated
  using (public.is_org_member(id));
create policy membership_read on public.memberships for select to authenticated
  using (user_id = (select auth.uid()));

-- Medlemmer kan lese og endre innholdet til egen kunde.
create policy member_all on public.brand_profiles for all to authenticated
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy member_all on public.content_plans for all to authenticated
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy member_all on public.media_assets for all to authenticated
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy member_all on public.posts for all to authenticated
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy member_all on public.post_variants for all to authenticated
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

-- Disse skrives bare av serveren. Medlemmer kan lese.
create policy member_read on public.social_accounts for select to authenticated
  using (public.is_org_member(org_id));
create policy member_read on public.publish_jobs for select to authenticated
  using (public.is_org_member(org_id));
create policy member_read on public.post_metrics for select to authenticated
  using (public.is_org_member(org_id));
create policy member_read on public.ai_runs for select to authenticated
  using (public.is_org_member(org_id));
