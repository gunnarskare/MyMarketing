export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// Vercel-integrasjonen for Supabase har brukt begge navnene, så begge godtas.
// Dette er den offentlige nøkkelen, som er trygg i nettleseren.
export const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

/** Usant til miljøvariablene er lagt inn. Da vises appen uten innlogging i stedet for å krasje. */
export function isSupabaseConfigured(): boolean {
  return supabaseUrl !== "" && supabaseKey !== "";
}
