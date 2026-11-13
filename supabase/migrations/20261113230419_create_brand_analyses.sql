-- Kjørt direkte i databasen 13. november; lagt inn i repoet i ettertid, uendret.
create table if not exists public.brand_analyses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references public.organizations(id) on delete cascade,
  schema_version integer not null default 1,
  website_url text,
  source_hash text,
  analysis jsonb not null,
  source_pages jsonb not null default '[]'::jsonb,
  model text,
  status text not null default 'ready' check (status in ('ready','needs_review')),
  analyzed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brand_analyses_analysis_object check (jsonb_typeof(analysis) = 'object'),
  constraint brand_analyses_source_pages_array check (jsonb_typeof(source_pages) = 'array')
);

create index if not exists brand_analyses_org_id_idx on public.brand_analyses(org_id);
alter table public.brand_analyses enable row level security;

drop policy if exists brand_analyses_member_all on public.brand_analyses;
create policy brand_analyses_member_all
on public.brand_analyses
for all
to authenticated
using (private.is_org_member(org_id))
with check (private.is_org_member(org_id));

grant select, insert, update on public.brand_analyses to authenticated;
