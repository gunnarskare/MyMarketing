-- Gjennomgang 14. november: strammer inn tilganger, hindrer duplikater i biblioteket
-- og legger inn kvoter for AI-kall og nettsidehenting.

-- ---------- 1. Bare rettighetene appen bruker ----------
-- Supabase gir som standard alt til anon og authenticated på nye tabeller. RLS stopper
-- det meste, men TRUNCATE går utenom RLS, så rettighetene settes eksplisitt.
revoke all on public.brand_assets, public.brand_service_requests, public.brand_typography
  from anon, authenticated;
grant select, insert, update, delete on public.brand_assets to authenticated;
grant select, insert on public.brand_service_requests to authenticated;
grant select, insert, update on public.brand_typography to authenticated;

-- ---------- 2. Indeks på fremmednøkkel (Supabase advisor) ----------
create index if not exists brand_analyses_approved_by_idx on public.brand_analyses (approved_by);

-- ---------- 3. Samme fil skal ikke ligge to ganger i biblioteket ----------
alter table public.brand_assets add column if not exists content_hash text
  constraint brand_assets_content_hash_format check (content_hash is null or content_hash ~ '^[0-9a-f]{64}$');
create unique index if not exists brand_assets_org_content_hash_key
  on public.brand_assets (org_id, content_hash) where content_hash is not null;

-- ---------- 4. Én hovedlogo (og én hovedfil per type) per bedrift ----------
update public.brand_assets a set is_primary = false
where a.is_primary and exists (
  select 1 from public.brand_assets b
  where b.org_id = a.org_id and b.kind = a.kind and b.is_primary and b.created_at > a.created_at
);
create unique index if not exists brand_assets_one_primary_per_kind
  on public.brand_assets (org_id, kind) where is_primary;

-- ---------- 5. Lagringsbøtta tar bare bilder og fonter ----------
-- application/octet-stream slapp inn hva som helst. SVG fra nettsider gjøres om til PNG på serveren.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg', 'image/png', 'image/webp', 'image/avif',
  'font/woff2', 'font/woff', 'font/ttf', 'font/otf'
]
where id = 'brand-assets';

-- ---------- 6. Kvoter for AI og nettsidehenting ----------
-- Serveren kaller denne før hvert AI-kall eller hver nettsidehenting. Funksjonen teller
-- kall de siste 24 timene, per bedrift og totalt, og registrerer kallet hvis det er plass.
-- Brukeren kan ikke slette rader i ai_runs, så telleren kan ikke nullstilles fra nettleseren.
create index if not exists ai_runs_type_created_idx on public.ai_runs (type, created_at desc);
create index if not exists ai_runs_org_type_created_idx on public.ai_runs (org_id, type, created_at desc);

create or replace function public.claim_ai_quota(p_org uuid, p_type text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_limit int;
  global_limit int;
  org_used int;
  global_used int;
  oldest timestamptz;
begin
  if auth.uid() is null or not private.is_org_member(p_org) then
    raise exception 'Not a member of this organization' using errcode = '42501';
  end if;

  case p_type
    when 'brand_analysis' then org_limit := 5;  global_limit := 200;
    when 'assistant'      then org_limit := 60; global_limit := 2000;
    when 'website_import' then org_limit := 20; global_limit := 1000;
    else raise exception 'Unknown quota type: %', p_type using errcode = '22023';
  end case;

  -- Ett kall om gangen per bedrift og type, så to samtidige kall ikke begge slipper gjennom.
  perform pg_advisory_xact_lock(hashtextextended(p_org::text || ':' || p_type, 0));

  select count(*), min(created_at) into org_used, oldest
  from public.ai_runs
  where org_id = p_org and type = p_type and created_at > now() - interval '24 hours';

  if org_used >= org_limit then
    return jsonb_build_object(
      'allowed', false, 'reason', 'org', 'remaining', 0,
      'retry_after_seconds', greatest(60, ceil(extract(epoch from (oldest + interval '24 hours' - now())))::int)
    );
  end if;

  select count(*) into global_used
  from public.ai_runs
  where type = p_type and created_at > now() - interval '24 hours';

  if global_used >= global_limit then
    return jsonb_build_object('allowed', false, 'reason', 'global', 'remaining', 0, 'retry_after_seconds', 3600);
  end if;

  insert into public.ai_runs (org_id, type, model) values (p_org, p_type, 'claimed');
  return jsonb_build_object('allowed', true, 'reason', null, 'remaining', org_limit - org_used - 1, 'retry_after_seconds', 0);
end;
$$;

revoke all on function public.claim_ai_quota(uuid, text) from public, anon;
grant execute on function public.claim_ai_quota(uuid, text) to authenticated;
