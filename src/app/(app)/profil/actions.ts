"use server";

import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/auth";
import { LANGUAGES, MAX_TEXT_LENGTH, normalizeWebsiteUrl } from "@/lib/brand-profile";

function readText(formData: FormData, name: string): string | null | undefined {
  const value = String(formData.get(name) ?? "").trim();
  if (value.length > MAX_TEXT_LENGTH) return undefined;
  return value === "" ? null : value;
}

export async function saveProfile(formData: FormData) {
  const { supabase, org } = await requireOrg();

  const websiteUrl = normalizeWebsiteUrl(String(formData.get("website_url") ?? ""));
  const tone = readText(formData, "tone");
  const audience = readText(formData, "audience");
  const products = readText(formData, "products");
  const avoid = readText(formData, "avoid");
  const language = String(formData.get("language") ?? "");

  if (websiteUrl === undefined) redirect("/profil?feil=nettside");
  if ([tone, audience, products, avoid].includes(undefined)) redirect("/profil?feil=lengde");
  if (!LANGUAGES.some((l) => l.value === language)) redirect("/profil?feil=lagring");

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
  if (error) redirect("/profil?feil=lagring");
  redirect("/profil?lagret=1");
}
