import { connection } from "next/server";
import { supabaseKey, supabaseUrl } from "./config";

/**
 * Spør Supabase om Google er slått på som innloggingsmåte, så knappen dukker
 * opp av seg selv når den er satt opp, og ikke vises før.
 *
 * Svarer bare «nei» når Supabase uttrykkelig sier at Google er av. Ved feil
 * eller uventet svar vises knappen heller enn å forsvinne uten forklaring.
 */
export async function isGoogleLoginEnabled(): Promise<boolean> {
  // Sjekkes ved hvert besøk, ikke når siden bygges.
  await connection();
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabaseKey },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return true;
    const settings: { external?: { google?: boolean } } = await response.json();
    return settings.external?.google !== false;
  } catch {
    return true;
  }
}
