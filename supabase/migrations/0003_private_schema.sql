-- is_org_member brukes bare av RLS-reglene. Flyttes ut av public slik at den
-- ikke kan kalles gjennom API-et. Reglene peker på funksjonen selv, ikke navnet,
-- så de virker som før.
create schema if not exists private;
grant usage on schema private to authenticated, service_role;
alter function public.is_org_member(uuid) set schema private;
