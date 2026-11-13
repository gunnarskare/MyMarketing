import { redirect } from "next/navigation";
import { cache } from "react";
import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";

export type Organization = { id: string; name: string };

/** Innlogget bruker, eller null. Verifiserer økten på serveren. */
export const getAuth = cache(async () => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return null;
  return {
    supabase,
    userId: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : "",
  };
});

/** Bruk øverst på sider som krever innlogging. */
export async function requireUser() {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  return auth;
}

/**
 * Kunden brukeren jobber med. RLS sørger for at bare egne kunder kommer tilbake.
 * MVP: første kunde brukeren er medlem av. Bytte mellom flere kunder kommer senere.
 */
export const getCurrentOrg = cache(async (): Promise<Organization | null> => {
  const auth = await getAuth();
  if (!auth) return null;
  const { data } = await auth.supabase
    .from("organizations")
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ?? null;
});

/** Bruk på sider som trenger en kunde. Sender nye brukere til oppstarten. */
export async function requireOrg() {
  const auth = await requireUser();
  const org = await getCurrentOrg();
  if (!org) redirect("/onboarding");
  return { ...auth, org };
}
