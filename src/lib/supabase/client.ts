import { createBrowserClient } from "@supabase/ssr";
import { cookieOptions, supabaseKey, supabaseUrl } from "./config";
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseKey, { cookieOptions });
}
