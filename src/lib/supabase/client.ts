import { createBrowserClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl } from "./config";

/** Supabase-klient for klientkomponenter. */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseKey);
}
