create table public.brand_service_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  requested_services text[] not null check (cardinality(requested_services) > 0),
  status text not null default 'requested' check (status in ('requested','in_progress','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index brand_service_requests_org_created_idx on public.brand_service_requests(org_id, created_at desc);
alter table public.brand_service_requests enable row level security;
grant select, insert on public.brand_service_requests to authenticated;
create policy brand_service_requests_member_select on public.brand_service_requests
  for select to authenticated using (private.is_org_member(org_id));
create policy brand_service_requests_member_insert on public.brand_service_requests
  for insert to authenticated with check (private.is_org_member(org_id));
