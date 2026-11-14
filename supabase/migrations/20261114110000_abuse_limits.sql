-- Grenser i selve databasen. Appen sjekker lengder før den lagrer, men en innlogget bruker
-- kan også snakke rett med databasen. Uten disse grensene kunne én konto fylt lagringen eller
-- sendt svært store tekster videre til AI-en på vår regning.

alter table public.brand_profiles
  add constraint brand_profiles_text_lengths check (
    coalesce(char_length(website_url), 0) <= 600
    and coalesce(char_length(tone), 0) <= 4000
    and coalesce(char_length(audience), 0) <= 4000
    and coalesce(char_length(products), 0) <= 4000
    and coalesce(char_length(avoid), 0) <= 4000
  );

alter table public.brand_analyses
  add constraint brand_analyses_size check (
    octet_length(analysis::text) <= 300000 and octet_length(source_pages::text) <= 30000
  );

alter table public.brand_typography
  add constraint brand_typography_size check (octet_length(settings::text) <= 30000);

alter table public.posts
  add constraint posts_meta_lengths check (
    coalesce(char_length(topic), 0) <= 300
    and coalesce(char_length(pillar), 0) <= 300
    and coalesce(char_length(image_idea), 0) <= 1000
  );

alter table public.brand_assets
  add constraint brand_assets_name_lengths check (char_length(original_name) <= 200 and char_length(storage_path) <= 400);

alter table public.brand_service_requests
  add constraint brand_service_requests_size check (
    cardinality(requested_services) <= 10 and octet_length(array_to_string(requested_services, '')) <= 2000
  );

-- Maks 300 filer per bedrift i biblioteket. Funksjonen teller som eier, fordi
-- en regel på storage.objects ikke kan lese sin egen tabell uten å gå i ring.
create or replace function private.org_storage_has_room(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) < 300
  from storage.objects
  where bucket_id = 'brand-assets' and name like target_org::text || '/%';
$$;

revoke all on function private.org_storage_has_room(uuid) from public, anon;
grant execute on function private.org_storage_has_room(uuid) to authenticated;

drop policy if exists brand_assets_storage_insert on storage.objects;
create policy brand_assets_storage_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'brand-assets'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then private.is_org_member(((storage.foldername(name))[1])::uuid)
        and private.org_storage_has_room(((storage.foldername(name))[1])::uuid)
    else false
  end
);
