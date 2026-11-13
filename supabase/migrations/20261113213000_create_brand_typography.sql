create table public.brand_typography (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint brand_typography_settings_object check (jsonb_typeof(settings) = 'object')
);
alter table public.brand_typography enable row level security;
grant select, insert, update on public.brand_typography to authenticated;
create policy brand_typography_member_all on public.brand_typography
  for all to authenticated
  using (private.is_org_member(org_id))
  with check (private.is_org_member(org_id));
