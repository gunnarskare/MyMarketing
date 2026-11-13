-- Oppretter en kunde, gjør innlogget bruker til eier og lager en tom merkevareprofil.
-- Brukere har ikke skrivetilgang til organizations eller memberships direkte,
-- så dette er eneste vei inn.
create function public.create_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  clean_name text := btrim(coalesce(org_name, ''));
  new_org_id uuid;
begin
  if current_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if char_length(clean_name) < 1 or char_length(clean_name) > 120 then
    raise exception 'invalid organization name' using errcode = '22023';
  end if;
  if (select count(*) from public.memberships where user_id = current_user_id) >= 10 then
    raise exception 'too many organizations' using errcode = '54000';
  end if;

  insert into public.organizations (name) values (clean_name) returning id into new_org_id;
  insert into public.memberships (org_id, user_id, role) values (new_org_id, current_user_id, 'owner');
  insert into public.brand_profiles (org_id) values (new_org_id);
  return new_org_id;
end;
$$;
revoke execute on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;
