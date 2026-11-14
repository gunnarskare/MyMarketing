import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./config";

let admin: SupabaseClient | null = null;

/**
 * Databaseklient med service-nøkkelen. Går utenom tilgangsreglene, så den brukes bare
 * der serveren selv har sjekket hvem som spør (Stripe-webhooken og betalingsflyten).
 */
export function createAdminClient(): SupabaseClient {
  if (admin) return admin;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !key) throw new Error("SUPABASE_SECRET_KEY mangler på serveren.");
  admin = createClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}
