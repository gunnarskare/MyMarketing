import type { SupabaseClient } from "@supabase/supabase-js";

export const TYPOGRAPHY_ROLES = [
  { key: "heading", label: "Overskrifter", description: "Titler og mellomtitler", sample: "Ferske kanelsnurrer hver morgen" },
  { key: "body", label: "Brødtekst", description: "Avsnitt, lister og skjemaer", sample: "Vi baker alt selv, hver natt, med mel fra lokale møller." },
  { key: "display", label: "Store titler", description: "Kampanjer og plakater", sample: "Ukas brød" },
  { key: "button", label: "Knapper", description: "Knapper og korte etiketter", sample: "Bestill lunsj" },
] as const;

export type TypographyRole = (typeof TYPOGRAPHY_ROLES)[number]["key"];
export type TypographySource = "google" | "upload";
export type TypographyAssignment = {
  family: string;
  source: TypographySource;
  assetId?: string | null;
  weights: number[];
  fallback: string;
};
export type TypographySettings = Record<TypographyRole, TypographyAssignment>;

/** Forslag i listen. Andre Google-fonter kan skrives inn med navn. */
export const GOOGLE_FONT_SUGGESTIONS = [
  "Inter", "DM Sans", "Manrope", "Plus Jakarta Sans", "Work Sans", "Space Grotesk", "Schibsted Grotesk", "Figtree",
  "Outfit", "Rubik", "Nunito Sans", "Source Sans 3", "Open Sans", "Lato", "Montserrat", "Poppins", "Raleway", "Roboto",
  "Oswald", "Bebas Neue", "Playfair Display", "Fraunces", "Lora", "Merriweather", "Libre Baskerville", "Cormorant Garamond",
  "DM Serif Display", "Crimson Pro", "EB Garamond", "Caveat",
];
const SERIF = new Set(["Playfair Display", "Fraunces", "Lora", "Merriweather", "Libre Baskerville", "Cormorant Garamond", "DM Serif Display", "Crimson Pro", "EB Garamond"]);
export const WEIGHTS = [300, 400, 500, 600, 700, 800, 900] as const;

export const FONT_NAME = /^[\p{L}\p{N}][\p{L}\p{N} '’-]{0,59}$/u;

export function fallbackFor(family: string): string {
  return SERIF.has(family) ? "serif" : family === "Caveat" ? "cursive" : "sans-serif";
}

export const DEFAULT_TYPOGRAPHY: TypographySettings = {
  heading: { family: "Inter", source: "google", assetId: null, weights: [600, 700], fallback: "sans-serif" },
  body: { family: "Inter", source: "google", assetId: null, weights: [400, 600], fallback: "sans-serif" },
  display: { family: "Inter", source: "google", assetId: null, weights: [800], fallback: "sans-serif" },
  button: { family: "Inter", source: "google", assetId: null, weights: [600], fallback: "sans-serif" },
};

export function normalizeTypography(value: unknown): TypographySettings {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const result: TypographySettings = { ...DEFAULT_TYPOGRAPHY };
  for (const role of TYPOGRAPHY_ROLES) {
    const candidate = input[role.key];
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as Record<string, unknown>;
    if (typeof item.family !== "string" || !item.family.trim()) continue;
    const family = item.family.trim().slice(0, 60);
    const weights = Array.isArray(item.weights)
      ? [...new Set(item.weights.filter((w): w is number => typeof w === "number" && (WEIGHTS as readonly number[]).includes(w)))].sort((a, b) => a - b)
      : [];
    result[role.key] = {
      family,
      source: item.source === "upload" ? "upload" : "google",
      assetId: typeof item.assetId === "string" ? item.assetId : null,
      weights: weights.length ? weights : [400, 700],
      fallback: typeof item.fallback === "string" && /^(serif|sans-serif|cursive|monospace)$/.test(item.fallback) ? item.fallback : fallbackFor(family),
    };
  }
  return result;
}

/** Sjekker innstillingene før lagring. Returnerer en feilmelding, eller null hvis alt er i orden. */
export function validateTypography(settings: TypographySettings, fontAssetIds: string[]): string | null {
  for (const role of TYPOGRAPHY_ROLES) {
    const item = settings[role.key];
    if (item.source === "upload" && (!item.assetId || !fontAssetIds.includes(item.assetId))) return `Velg en opplastet font for ${role.label.toLowerCase()}.`;
    if (item.source === "google" && !FONT_NAME.test(item.family)) return `Skriv inn navnet på en Google-font for ${role.label.toLowerCase()}.`;
    if (!item.weights.length) return `Velg minst ett snitt for ${role.label.toLowerCase()}.`;
  }
  return null;
}

/** Felles kilde for alt som lager innhold på serveren. */
export async function getTypographyForOrg(supabase: SupabaseClient, orgId: string): Promise<TypographySettings> {
  const { data } = await supabase.from("brand_typography").select("settings").eq("org_id", orgId).maybeSingle();
  return normalizeTypography(data?.settings);
}
