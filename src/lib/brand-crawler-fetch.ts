import { safeFetch } from "./safe-fetch";

const MAX_HTML_BYTES = 2_000_000;
const PAGE_TYPES = ["text/html", "application/xhtml+xml", "application/xml", "text/xml"] as const;

/** Henter en HTML-side (eller sitemap) fra en offentlig nettside. */
export async function fetchPublicHtml(raw: string): Promise<{ html: string; url: string }> {
  const page = await safeFetch(raw, {
    maxBytes: MAX_HTML_BYTES,
    types: PAGE_TYPES,
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/xml;q=0.9",
    timeoutMs: 6_000,
  });
  return { html: page.bytes.toString("utf8"), url: page.url };
}

const ENTITIES: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", aring: "å", Aring: "Å", oslash: "ø", Oslash: "Ø", aelig: "æ", AElig: "Æ" };

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name] ?? match);
}

/** Leselig tekst fra en side: tittel, beskrivelse og innhold. Menyer og skript fjernes. */
export function extractPageText(html: string): string {
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  const description =
    html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] ??
    html.match(/<meta\b[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i)?.[1] ??
    "";
  const text = decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      // Bunnteksten beholdes: der står ofte adresse, åpningstider og org.nr.
      .replace(/<(script|style|noscript|svg|nav|template|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|section|article|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\f\v\r]+/g, " ")
    .replace(/\n\s*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
  return [title && "Tittel: " + decodeEntities(title.trim()), description && "Beskrivelse: " + decodeEntities(description), text]
    .filter(Boolean)
    .join("\n")
    .slice(0, 12_000);
}
