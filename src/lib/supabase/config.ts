export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** Usant til miljøvariablene er lagt inn. Da vises appen uten innlogging i stedet for å krasje. */
export function isSupabaseConfigured(): boolean {
  return supabaseUrl !== "" && supabaseKey !== "";
}
