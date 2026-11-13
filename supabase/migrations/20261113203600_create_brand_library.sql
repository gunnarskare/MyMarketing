-- Private, organization-scoped brand assets (images, logos and font files).
create table public.brand_assets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('image','logo','font')),
  original_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  file_size bigint not null check (file_size > 0),
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index brand_assets_org_created_idx on public.brand_assets(org_id, created_at desc);
alter table public.brand_assets enable row level security;
grant select, insert, update, delete on public.brand_assets to authenticated;
create policy brand_assets_member_all on public.brand_assets for all to authenticated
  using (private.is_org_member(org_id)) with check (private.is_org_member(org_id));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('brand-assets','brand-assets',false,15728640,array[
'image/jpeg','image/png','image/webp','image/avif',
'font/woff2','font/woff','font/ttf','font/otf',
'application/font-woff','application/x-font-ttf','application/vnd.ms-opentype','application/octet-stream'
])
on conflict(id) do update set public=false,file_size_limit=15728640,allowed_mime_types=excluded.allowed_mime_types;

create policy brand_assets_storage_select on storage.objects for select to authenticated
using (bucket_id='brand-assets' and case when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then private.is_org_member(((storage.foldername(name))[1])::uuid) else false end);
create policy brand_assets_storage_insert on storage.objects for insert to authenticated
with check (bucket_id='brand-assets' and case when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then private.is_org_member(((storage.foldername(name))[1])::uuid) else false end);
create policy brand_assets_storage_delete on storage.objects for delete to authenticated
using (bucket_id='brand-assets' and case when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then private.is_org_member(((storage.foldername(name))[1])::uuid) else false end);
