-- Ukas utkast: Spott skriver innlegg for en uke, kunden retter, godkjenner og publiserer selv.
-- Innlegget får kanal, emneknagger og bildeforslag direkte. post_variants tas i bruk når
-- automatisk publisering til tilkoblede kontoer kommer.

alter table public.posts
  add column if not exists platform text check (platform in ('facebook', 'instagram', 'linkedin')),
  add column if not exists pillar text,
  add column if not exists hashtags text[] not null default '{}',
  add column if not exists image_idea text,
  add column if not exists asset_id uuid references public.brand_assets(id) on delete set null,
  add column if not exists published_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.posts add constraint posts_base_text_length check (char_length(base_text) <= 5000);
alter table public.posts add constraint posts_hashtags_count check (cardinality(hashtags) <= 15);
create index if not exists posts_asset_id on public.posts (asset_id);
create index if not exists posts_org_scheduled on public.posts (org_id, scheduled_at);

-- Én plan per bedrift og uke.
create unique index if not exists content_plans_org_period on public.content_plans (org_id, period_start);

-- Kvoter: to nye typer. Resten av funksjonen er som før.
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
    when 'weekly_plan'    then org_limit := 10; global_limit := 500;
    when 'post_rewrite'   then org_limit := 60; global_limit := 3000;
    else raise exception 'Unknown quota type: %', p_type using errcode = '22023';
  end case;

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
