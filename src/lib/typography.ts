export const TYPOGRAPHY_ROLES = [
  { key: "heading", label: "Overskrifter", description: "H1–H6 og vanlige seksjonsoverskrifter", sample: "Dette er en overskrift" },
  { key: "body", label: "Brødtekst og UI", description: "Avsnitt, skjemaer, menyer og grensesnitt", sample: "Dette er brødtekst. Den skal være behagelig å lese også i lengre tekster." },
  { key: "display", label: "Display / aksent", description: "Store kampanjeoverskrifter og særskilte visuelle uttrykk", sample: "Et uttrykk som skiller seg ut" },
  { key: "button", label: "Knapper og etiketter", description: "Handlingsknapper, små etiketter og korte CTA-er", sample: "Les mer · Kom i gang" },
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

export const GOOGLE_FONT_CATALOG = [
  "Manrope", "DM Sans", "Playfair Display", "Inter", "Roboto", "Open Sans",
  "Montserrat", "Poppins", "Lato", "Nunito Sans", "Source Sans 3",
  "Merriweather", "Lora", "Cormorant Garamond", "Space Grotesk", "Work Sans",
  "Libre Baskerville", "Oswald", "Raleway", "Plus Jakarta Sans",
];

export const DEFAULT_TYPOGRAPHY: TypographySettings = {
  heading: { family: "Manrope", source: "google", weights: [400, 500, 600, 700, 800], fallback: "sans-serif" },
  body: { family: "DM Sans", source: "google", weights: [400, 500, 600, 700], fallback: "sans-serif" },
  display: { family: "Playfair Display", source: "google", weights: [400, 500, 600, 700], fallback: "serif" },
  button: { family: "DM Sans", source: "google", weights: [500, 600, 700], fallback: "sans-serif" },
};

export function normalizeTypography(value: unknown): TypographySettings {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const result: TypographySettings = { ...DEFAULT_TYPOGRAPHY };
  for (const role of TYPOGRAPHY_ROLES) {
    const candidate = input[role.key];
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as Record<string, unknown>;
    if (typeof item.family !== "string" || !item.family.trim()) continue;
    result[role.key] = {
      family: item.family.trim().slice(0, 120),
      source: item.source === "upload" ? "upload" : "google",
      assetId: typeof item.assetId === "string" ? item.assetId : null,
      weights: Array.isArray(item.weights) ? item.weights.filter((w): w is number => typeof w === "number" && [300,400,500,600,700,800,900].includes(w)).slice(0, 7) : [400, 500, 700],
      fallback: typeof item.fallback === "string" ? item.fallback.slice(0, 40) : "sans-serif",
    };
  }
  return result;
}

/** Shared, server-side source of truth for all AI content generators. */
export async function getTypographyForOrg(
  supabase: { from: (table: string) => any },
  orgId: string,
): Promise<TypographySettings> {
  const { data } = await supabase.from("brand_typography").select("settings").eq("org_id", orgId).maybeSingle();
  return normalizeTypography(data?.settings);
}
