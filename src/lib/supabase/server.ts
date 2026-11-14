import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cookieOptions, supabaseKey, supabaseUrl } from "./config";

/** Supabase-klient for serverkomponenter, server actions og route handlers. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Kalt fra en serverkomponent, som ikke kan skrive cookies.
          // Proxyen (src/proxy.ts) fornyer økten, så dette kan ignoreres.
        }
      },
    },
  });
}
