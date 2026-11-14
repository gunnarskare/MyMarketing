-- Hva hvert AI-kall koster. claim_ai_quota oppretter raden i ai_runs før kallet (model = 'claimed')
-- og gir nå tilbake id-en. Når OpenAI har svart, fører serveren på modell, tokens og anslått
-- kostnad med record_ai_usage. Bare serveren (service-nøkkelen) kan føre forbruket: innloggede
-- brukere kan fortsatt bare lese radene til egen bedrift, ikke endre eller slette dem.

-- ---------- 1. Kostnaden ----------
-- Seks desimaler, fordi et lite kall koster brøkdeler av en cent. Tom (null) når modellen
-- ikke står i pristabellen, så slike rader er lette å finne. Eldre rader beholder 0.
alter table public.ai_runs
  alter column cost type numeric(12, 6),
  alter column cost drop not null;

alter table public.ai_runs
  add constraint ai_runs_usage_values check (tokens >= 0 and (cost is null or cost >= 0)),
  add constraint ai_runs_model_length check (char_length(model) between 1 and 100);

comment on column public.ai_runs.model is
  'Modellen OpenAI svarte med. ''claimed'' til forbruket er ført (eller når kallet ikke nådde OpenAI).';
comment on column public.ai_runs.tokens is 'Input- pluss output-tokens for hele kjøringen.';
comment on column public.ai_runs.cost is
  'Anslått kostnad i USD etter pristabellen i src/lib/ai/pricing.ts. null betyr ukjent pris for modellen.';

-- ---------- 2. Kvoten gir tilbake id-en til raden ----------
-- Som i 20261114100000_weekly_plan.sql, men med run_id i svaret.
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
  run_id uuid;
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

  insert into public.ai_runs (org_id, type, model) values (p_org, p_type, 'claimed') returning id into run_id;
  return jsonb_build_object(
    'allowed', true, 'reason', null, 'remaining', org_limit - org_used - 1, 'retry_after_seconds', 0, 'run_id', run_id
  );
end;
$$;

revoke all on function public.claim_ai_quota(uuid, text) from public, anon;
grant execute on function public.claim_ai_quota(uuid, text) to authenticated;

-- ---------- 3. Forbruket føres av serveren ----------
-- Kjører med rettighetene til den som kaller (security invoker), og bare service_role får kalle den.
-- Innloggede brukere har ikke update på ai_runs, så de kan verken bruke denne eller endre radene selv.
-- Hver rad føres én gang: en rad som allerede har fått modell, endres ikke. Svarer false hvis
-- raden ikke finnes eller allerede er ført.
create or replace function public.record_ai_usage(p_run uuid, p_model text, p_tokens int, p_cost numeric)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_model is null or p_model = 'claimed' then
    raise exception 'Invalid model' using errcode = '22023';
  end if;

  update public.ai_runs
  set model = p_model, tokens = p_tokens, cost = p_cost
  where id = p_run and model = 'claimed';
  return found;
end;
$$;

revoke all on function public.record_ai_usage(uuid, text, int, numeric) from public, anon, authenticated;
grant execute on function public.record_ai_usage(uuid, text, int, numeric) to service_role;
