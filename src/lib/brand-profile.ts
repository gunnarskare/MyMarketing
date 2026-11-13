export const LANGUAGES = [
  { value: "nb", label: "Norsk bokmål" },
  { value: "nn", label: "Norsk nynorsk" },
  { value: "en", label: "Engelsk" },
] as const;

export type BrandProfile = {
  website_url: string | null;
  tone: string | null;
  audience: string | null;
  products: string | null;
  avoid: string | null;
  language: string;
};

export const MAX_TEXT_LENGTH = 2000;

/**
 * Godtar "dinbedrift.no" og "https://dinbedrift.no".
 * Returnerer null for tomt felt og undefined for noe som ikke er en nettadresse.
 */
export function normalizeWebsiteUrl(raw: string): string | null | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (trimmed.length > 500) return undefined;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    if (!url.hostname.includes(".")) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}
