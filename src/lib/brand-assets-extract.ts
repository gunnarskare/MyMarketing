// Finner bilder, logoer, farger og skrifttyper i HTML og CSS fra en nettside.
// Ingen nettverkskode og ingen relative importer, så filen kan testes direkte (tests/unit).

export type AssetCandidate = { url: string; name: string; category: string };
export type ColorCount = { hex: string; count: number; neutral: boolean };

export const IMAGE_CATEGORIES = ["Logo", "Ikon", "Banner / toppgrafikk", "Delingsgrafikk", "Produkt / galleri", "Bilde / foto", "SVG / vektorgrafikk", "CSS-bakgrunn / grafikk"] as const;

const IMAGE_PATH = /\.(jpe?g|png|webp|avif|svg)(?:[?#]|$)/i;

function decode(value: string): string {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function classify(name: string, raw: string): string {
  const value = (name + " " + raw).toLowerCase();
  if (/logo|wordmark|brandmark|logotype|merke/.test(value)) return "Logo";
  if (/favicon|apple-touch|icon|ikon|symbol/.test(value)) return "Ikon";
  if (/\.svg(?:[?#]|$)/i.test(raw)) return "SVG / vektorgrafikk";
  if (/banner|hero|header|cover|topp/.test(value)) return "Banner / toppgrafikk";
  if (/product|produkt|gallery|galleri|portfolio/.test(value)) return "Produkt / galleri";
  return "Bilde / foto";
}

export function imageCandidatesFromHtml(html: string, pageUrl: string): AssetCandidate[] {
  const found = new Map<string, AssetCandidate>();
  const add = (raw: string | undefined, name: string, category: string) => {
    if (!raw || /^(data:|blob:|#)/i.test(raw.trim())) return;
    try {
      const url = new URL(decode(raw.trim()), pageUrl);
      if (url.protocol !== "https:") return;
      if (!IMAGE_PATH.test(url.pathname) && !/image\/(jpeg|png|webp|avif|svg\+xml)/i.test(url.search)) return;
      const key = url.toString();
      const previous = found.get(key);
      // Samme fil kan dukke opp flere steder. Behold den mest nyttige kategorien.
      if (!previous || (category === "Logo" && previous.category !== "Logo")) {
        found.set(key, { url: key, name: name.trim().slice(0, 100) || "Bilde fra nettsiden", category });
      }
    } catch { /* ugyldig bildeadresse */ }
  };
  const addSrcset = (raw: string | undefined, name: string, category: string) => {
    if (!raw) return;
    for (const candidate of raw.split(",")) add(candidate.trim().split(/\s+/)[0], name, category);
  };

  for (const match of html.matchAll(/<img\b([^>]{0,8000})>/gi)) {
    const attrs = match[1];
    const src = attrs.match(/\b(?:src|data-src|data-lazy-src|data-original|data-fallback-src)\s*=\s*["']([^"']+)["']/i)?.[1]
      ?? attrs.match(/\bsrc\s*=\s*([^\s>"']+)/i)?.[1];
    const name = decode(attrs.match(/\b(?:alt|title|aria-label)\s*=\s*["']([^"']*)["']/i)?.[1] ?? "") || "Bilde fra nettsiden";
    const classes = attrs.match(/\b(?:class|id)\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
    const category = classify(name + " " + classes, src ?? "");
    add(src, name, category);
    addSrcset(attrs.match(/\b(?:srcset|data-srcset|data-lazy-srcset)\s*=\s*["']([^"']+)["']/i)?.[1], name, category);
  }
  for (const match of html.matchAll(/<source\b([^>]{0,8000})>/gi)) {
    const raw = match[1].match(/\b(?:srcset|data-srcset)\s*=\s*["']([^"']+)["']/i)?.[1];
    addSrcset(raw, "Responsivt bilde", classify("", raw ?? ""));
  }
  for (const match of html.matchAll(/<meta\b([^>]+)>/gi)) {
    const attrs = match[1];
    const key = attrs.match(/\b(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i)?.[1] ?? "";
    if (/og:image|twitter:image|image_src|^image$/i.test(key)) add(attrs.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1], "Delingsbilde", "Delingsgrafikk");
  }
  for (const match of html.matchAll(/<link\b([^>]+)>/gi)) {
    const attrs = match[1];
    const rel = attrs.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1] ?? "";
    const href = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (/icon|apple-touch-icon|mask-icon/i.test(rel)) add(href, "Nettstedsikon", "Ikon");
    if (/preload/i.test(rel) && /\bas\s*=\s*["']image["']/i.test(attrs)) add(href, "Forhåndslastet grafikk", "Banner / toppgrafikk");
  }
  // Strukturerte data: "logo": "https://…"
  for (const match of html.matchAll(/"logo"\s*:\s*(?:\{[^}]*?"url"\s*:\s*)?"([^"]+)"/gi)) add(match[1].replace(/\\\//g, "/"), "Logo fra strukturerte data", "Logo");
  const inlineCss = [
    ...[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]),
    // style="…url('…')…" er vanlig, så doble og enkle anførselstegn leses hver for seg.
    ...[...html.matchAll(/\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map((m) => m[1] ?? m[2]),
  ];
  for (const css of inlineCss) {
    for (const candidate of imageCandidatesFromCss(css, pageUrl)) add(candidate.url, candidate.name, candidate.category);
  }
  const order = (category: string) => {
    const index = (IMAGE_CATEGORIES as readonly string[]).indexOf(category);
    return index < 0 ? 99 : index;
  };
  return [...found.values()].sort((a, b) => order(a.category) - order(b.category)).slice(0, 100);
}

export function imageCandidatesFromCss(css: string, cssUrl: string): AssetCandidate[] {
  const assets: AssetCandidate[] = [];
  const seen = new Set<string>();
  for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    const raw = match[1].trim();
    if (!raw || /^(data:|blob:|#)/i.test(raw)) continue;
    try {
      const url = new URL(decode(raw), cssUrl);
      if (url.protocol !== "https:" || seen.has(url.toString()) || !IMAGE_PATH.test(url.pathname)) continue;
      seen.add(url.toString());
      const isSvg = /\.svg(?:[?#]|$)/i.test(url.pathname);
      assets.push({
        url: url.toString(),
        name: isSvg ? "SVG-grafikk fra stilarket" : "Bakgrunnsbilde fra stilarket",
        category: /logo|brand|merke/i.test(raw) ? "Logo" : isSvg ? "SVG / vektorgrafikk" : "CSS-bakgrunn / grafikk",
      });
    } catch { /* ugyldig adresse */ }
  }
  return assets;
}

export function stylesheetUrls(html: string, pageUrl: string, limit = 4): string[] {
  const urls = new Set<string>();
  for (const match of html.matchAll(/<link\b([^>]+)>/gi)) {
    const attrs = match[1];
    const rel = attrs.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1] ?? "";
    const href = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!/stylesheet/i.test(rel) || !href) continue;
    try {
      const url = new URL(decode(href), pageUrl);
      // Google Fonts-stilark gir bare skriftnavn, og de leses fra lenken direkte.
      if (url.protocol === "https:" && url.hostname !== "fonts.googleapis.com") urls.add(url.toString());
    } catch { /* ugyldig lenke */ }
  }
  return [...urls].slice(0, limit);
}

// ---------- Farger ----------

function toHex(value: string): string | null {
  const v = value.trim().toLowerCase();
  let match = v.match(/^#([0-9a-f]{3,4})$/);
  if (match) return "#" + match[1].slice(0, 3).split("").map((c) => c + c).join("");
  match = v.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/);
  if (match) return match[2] && parseInt(match[2], 16) < 230 ? null : "#" + match[1];
  match = v.match(/^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
  if (match) {
    const alpha = match[4] ? (match[4].endsWith("%") ? parseFloat(match[4]) / 100 : parseFloat(match[4])) : 1;
    if (alpha < 0.9) return null;
    const channels = match.slice(1, 4).map(Number);
    if (channels.some((c) => c > 255)) return null;
    return "#" + channels.map((c) => c.toString(16).padStart(2, "0")).join("");
  }
  return null;
}

function isNeutral(hex: string): boolean {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  return saturation < 0.12 || max < 0.1;
}

/** Teller farger som faktisk brukes i fargeegenskaper. Merkevarefarger først, nøytrale til slutt. */
export function countColors(css: string, into = new Map<string, number>()): Map<string, number> {
  const declaration = /(?:^|[;{\s])(--[\w-]+|color|background(?:-color)?|border(?:-[a-z]+)?-color|border|outline-color|fill|stroke|box-shadow|text-decoration-color)\s*:\s*([^;{}]+)/gi;
  for (const match of css.matchAll(declaration)) {
    for (const value of match[2].match(/#[0-9a-f]{3,8}\b|rgba?\([^)]{5,60}\)/gi) ?? []) {
      const hex = toHex(value);
      if (hex) into.set(hex, (into.get(hex) ?? 0) + 1);
    }
  }
  return into;
}

export function rankColors(counts: Map<string, number>, limit = 16): ColorCount[] {
  const all = [...counts.entries()].map(([hex, count]) => ({ hex, count, neutral: isNeutral(hex) }));
  const brand = all.filter((c) => !c.neutral).sort((a, b) => b.count - a.count);
  const neutral = all.filter((c) => c.neutral).sort((a, b) => b.count - a.count);
  return [...brand.slice(0, limit - 4), ...neutral.slice(0, 4)].slice(0, limit);
}

// ---------- Skrifttyper ----------

const GENERIC_FONTS = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-sans-serif|ui-serif|ui-monospace|ui-rounded|emoji|math|fangsong|inherit|initial|unset|revert|-apple-system|blinkmacsystemfont|segoe ui|segoe ui emoji|segoe ui symbol|apple color emoji|noto color emoji|sans)$/i;
const ICON_FONTS = /(awesome|fontawesome|dashicons|icomoon|material icons|material symbols|eicons|etmodules|glyphicons|ionicons|feather|bootstrap-icons|swiper-icons|slick|revicons|elementskit|themify|linearicons|socicon)/i;

/** Navn på skrifttyper brukt i CSS og Google Fonts-lenker, mest brukt først. */
export function countFonts(source: string, into = new Map<string, number>()): Map<string, number> {
  const add = (raw: string) => {
    const name = raw.trim().replace(/^["']|["']$/g, "").replace(/\s+/g, " ").trim();
    if (!name || name.length > 60 || name.startsWith("var(") || GENERIC_FONTS.test(name) || ICON_FONTS.test(name)) return;
    if (!/^[\p{L}\p{N} ._-]+$/u.test(name)) return;
    into.set(name, (into.get(name) ?? 0) + 1);
  };
  for (const match of source.matchAll(/font-family\s*:\s*([^;{}]{1,200})/gi)) {
    const first = match[1].split(",").map((part) => part.trim()).find((part) => part && !part.startsWith("var("));
    if (first) add(first);
  }
  for (const match of source.matchAll(/fonts\.googleapis\.com\/css2?\?([^"'\s)>]+)/gi)) {
    const query = decode(match[1]);
    for (const part of query.split("&")) {
      if (!part.startsWith("family=")) continue;
      for (const family of decodeURIComponent(part.slice(7).replace(/\+/g, " ")).split("|")) add(family.split(":")[0]);
    }
  }
  return into;
}

export function rankFonts(counts: Map<string, number>, limit = 8): string[] {
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([name]) => name);
}

// ---------- SVG ----------

/** Fjerner skript og eksterne referanser fra SVG før den gjøres om til PNG. */
export function sanitizeSvg(input: string): string {
  if (!/<svg[\s>]/i.test(input)) throw new Error("Filen er ikke en gyldig SVG.");
  return input
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .replace(/<!ENTITY[\s\S]*?>/gi, "")
    .replace(/<\?xml[^>]*>/gi, "")
    // <style> beholdes: eksporterte logoer har ofte fargene sine der. url() og @import fjernes under.
    .replace(/<\s*(script|foreignObject|iframe|object|embed)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|foreignObject|iframe|object|embed)\b[^>]*\/\s*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(?:href|xlink:href)\s*=\s*(["'])(?!#|data:image\/(?:png|jpe?g|webp);base64,)[\s\S]*?\1/gi, "")
    .replace(/url\(\s*["']?(?!#)[^)]+\)/gi, "none")
    .replace(/@import[^;]+;?/gi, "");
}
