-- Kjørt direkte i databasen 13. november; lagt inn i repoet i ettertid, uendret.
alter table public.brand_analyses add column if not exists profile_hash text;
