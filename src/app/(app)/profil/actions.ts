"use server";

import { requireOrg } from "@/lib/auth";
import { LANGUAGES, MAX_TEXT_LENGTH, normalizeWebsiteUrl } from "@/lib/brand-profile";

export type SaveProfileState = { status: "idle" } | { status: "saved" } | { status: "error"; message: string };

const ERRORS = {
  website: "Nettadressen ser ikke riktig ut. Prøv for eksempel dinbedrift.no.",
  length: `Hvert felt kan ha opptil ${MAX_TEXT_LENGTH} tegn.`,
  save: "Vi klarte ikke å lagre profilen. Prøv igjen.",
};

function readText(formData: FormData, name: string): string | null | undefined {
  const value = String(formData.get(name) ?? "").trim();
  if (value.length > MAX_TEXT_LENGTH) return undefined;
  return value === "" ? null : value;
}

// Svarer med en status i stedet for å sende brukeren til en ny side.
// Da blir skjemaet stående der det er, og beskjeden vises ved knappen.
export async function saveProfile(_previous: SaveProfileState, formData: FormData): Promise<SaveProfileState> {
  const { supabase, org } = await requireOrg();

  const websiteUrl = normalizeWebsiteUrl(String(formData.get("website_url") ?? ""));
  const tone = readText(formData, "tone");
  const audience = readText(formData, "audience");
  const products = readText(formData, "products");
  const avoid = readText(formData, "avoid");
  const language = String(formData.get("language") ?? "");

  if (websiteUrl === undefined) return { status: "error", message: ERRORS.website };
  if ([tone, audience, products, avoid].includes(undefined)) return { status: "error", message: ERRORS.length };
  if (!LANGUAGES.some((l) => l.value === language)) return { status: "error", message: ERRORS.save };

  // org.id kommer fra serveren, og RLS avviser uansett skriving til andres kunder.
  const { error } = await supabase.from("brand_profiles").upsert(
    {
      org_id: org.id,
      website_url: websiteUrl,
      tone,
      audience,
      products,
      avoid,
      language,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id" },
  );
  if (error) return { status: "error", message: ERRORS.save };
  return { status: "saved" };
}
