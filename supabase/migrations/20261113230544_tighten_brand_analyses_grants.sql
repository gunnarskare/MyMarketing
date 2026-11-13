-- Kjørt direkte i databasen 13. november; lagt inn i repoet i ettertid, uendret.
revoke all privileges on table public.brand_analyses from anon, authenticated; grant select, insert, update on table public.brand_analyses to authenticated;
