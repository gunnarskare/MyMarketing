import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { crawlWebsite } from "@/lib/brand-crawler";

export const maxDuration = 30;

const MAX_HTML = 2_000_000;
const MAX_IMAGE = 2_500_000;
const MAX_TOTAL = 8_000_000;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const PRIVATE_V4 = /^(0|10|127|169\.254|172\.(1[6-9]|2\d|3[01])|192\.168|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7]))\./;

function isPublicIp(ip: string) {
  if (isIP(ip) === 4) return !PRIVATE_V4.test(ip) && ip !== "255.255.255.255";
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    return v === "::1" ? false : !(v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80:") || v.startsWith("::ffff:"));
  }
  return false;
}

async function resolvePublicRecords(host: string) {
  if (isIP(host)) return [{ address: host }];
  let lastError: unknown;
  // DNS resolvers can temporarily return EBUSY/EAI_AGAIN under load.
  // Retry transient errors without bypassing the public-IP validation.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await lookup(host, { all: true, verbatim: true });
    } catch (error) {
      lastError = error;
      const code = (error as NodeJS.ErrnoException).code;
      if (!["EBUSY", "EAI_AGAIN", "ETIMEOUT"].includes(code ?? "") || attempt === 2) break;
      await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }
  const code = (lastError as NodeJS.ErrnoException | undefined)?.code;
  if (["EBUSY", "EAI_AGAIN", "ETIMEOUT"].includes(code ?? "")) {
    throw new Error("DNS-oppslaget er midlertidig utilgjengelig. Vent litt og prøv igjen.");
  }
  throw lastError instanceof Error ? lastError : new Error("Kunne ikke slå opp domenet.");
}

async function safeUrl(raw: string, base?: string) {
  const url = new URL(raw, base);
  if (url.protocol !== "https:" || url.username || url.password || !url.hostname || url.port && url.port !== "443") {
    throw new Error("Bare HTTPS-adresser på offentlig nett støttes.");
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Adressen peker mot et privat eller lokalt nettverk.");
  }
  const records = await resolvePublicRecords(host);
  if (!records.length || records.some(record => !isPublicIp(record.address))) {
    throw new Error("Adressen peker mot et privat eller reservert nettverk.");
  }
  return url;
}

async function fetchPublic(raw: string, maxBytes: number, imageOnly = false, allowXml = false) {
  let url = await safeUrl(raw);
  for (let hop = 0; hop < 4; hop++) {
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(12_000), headers: { "User-Agent": "SpottBrandImporter/1.0", Accept: imageOnly ? "image/*" : allowXml ? "text/html,application/xhtml+xml,application/xml,text/xml" : "text/html,application/xhtml+xml" } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Ugyldig videresending fra nettsiden.");
      url = await safeUrl(location, url.toString());
      continue;
    }
    if (!response.ok) throw new Error("Nettsiden svarte med HTTP " + response.status + ".");
    const type = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (imageOnly && !IMAGE_TYPES.has(type)) throw new Error("Filtypen er ikke et støttet bildeformat.");
    if (!imageOnly && !(["text/html", "application/xhtml+xml"].includes(type) || allowXml && ["application/xml", "text/xml"].includes(type))) throw new Error("Adressen leverte ikke en HTML- eller XML-side.");
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > maxBytes) throw new Error("Filen er større enn tillatt grense.");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Kunne ikke lese svaret fra nettsiden.");
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new Error("Filen er større enn tillatt grense."); }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks.map(x => Buffer.from(x)));
    return { bytes, type, url: url.toString() };
  }
  throw new Error("For mange videresendinger.");
}

function decode(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function candidatesFromHtml(html: string, pageUrl: string) {
  const found = new Map<string, { url: string; name: string; category: string }>();
  const add = (raw: string | undefined, name: string, category: string) => {
    if (!raw || raw.startsWith("data:") || raw.startsWith("blob:")) return;
    try {
      const u = new URL(decode(raw.trim()), pageUrl);
      if (u.protocol !== "https:") return;
      if (!/\.(jpe?g|png|webp|avif)(?:[?#]|$)/i.test(u.pathname) && !/image\/(jpeg|png|webp|avif)/i.test(u.search)) return;
      const previous = found.get(u.toString());
      // Keep the most useful classification when the same file appears in several places.
      if (!previous || /logo|ikon|grafikk/i.test(category)) {
        found.set(u.toString(), { url: u.toString(), name: name.slice(0, 100) || "Grafikk fra nettsiden", category });
      }
    } catch { /* ignorer ugyldige bildeadresser */ }
  };
  const addSrcset = (raw: string | undefined, name: string, category: string) => {
    if (!raw) return;
    for (const candidate of raw.split(",")) add(candidate.trim().split(/\s+/)[0], name, category);
  };
  const classify = (name: string, raw: string) => {
    const value = (name + " " + raw).toLowerCase();
    if (/logo|wordmark|brandmark|logotype/.test(value)) return "Logo";
    if (/favicon|apple-touch|icon|symbol/.test(value)) return "Ikon";
    if (/banner|hero|header|cover/.test(value)) return "Banner / toppgrafikk";
    if (/product|produkt|gallery|portfolio/.test(value)) return "Produkt / galleri";
    return "Bilde / foto";
  };

  // Standard images, lazy-loaded images and responsive image candidates.
  for (const match of html.matchAll(/<img\b([^>]{0,8000})>/gi)) {
    const attrs = match[1];
    const src = attrs.match(/\b(?:src|data-src|data-lazy-src|data-original|data-fallback-src)\s*=\s*["']([^"']+)["']/i)?.[1]
      ?? attrs.match(/\bsrc\s*=\s*([^\s>]+)/i)?.[1];
    const name = attrs.match(/\b(?:alt|title|aria-label)\s*=\s*["']([^"']*)["']/i)?.[1] ?? "Bilde fra nettsiden";
    const category = classify(name, src ?? "");
    add(src, name, category);
    addSrcset(attrs.match(/\b(?:srcset|data-srcset|data-lazy-srcset)\s*=\s*["']([^"']+)["']/i)?.[1], name, category);
  }
  // <picture><source srcset> and other responsive sources.
  for (const match of html.matchAll(/<source\b([^>]{0,8000})>/gi)) {
    const attrs = match[1];
    const raw = attrs.match(/\b(?:srcset|data-srcset)\s*=\s*["']([^"']+)["']/i)?.[1];
    addSrcset(raw, "Responsivt bilde", classify("", raw ?? ""));
  }
  // Social previews, favicons, touch icons, mask icons and preloaded images.
  for (const match of html.matchAll(/<meta\b([^>]+)>/gi)) {
    const attrs = match[1];
    const key = attrs.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1] ?? "";
    if (/og:image|twitter:image|image_src/i.test(key)) add(attrs.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1], "Delingsbilde", "Delingsgrafikk");
  }
  for (const match of html.matchAll(/<link\b([^>]+)>/gi)) {
    const attrs = match[1];
    const rel = attrs.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1] ?? "";
    const href = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (/icon|apple-touch-icon|mask-icon/i.test(rel)) add(href, "Nettstedsikon", "Ikon");
    if (/preload/i.test(rel) && /image/i.test(attrs)) add(href, "Forhåndslastet grafikk", "Banner / toppgrafikk");
  }
  // CSS background-image and other url(...) references in inline styles and embedded stylesheets.
  const cssBlocks = [
    ...[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]),
    ...[...html.matchAll(/\bstyle\s*=\s*["']([^"']*)["']/gi)].map(m => m[1]),
  ];
  for (const css of cssBlocks) {
    for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
      const raw = match[1].trim();
      add(raw, "CSS-bakgrunn / grafikk", classify("", raw));
    }
  }
  const colors = [...new Set((html.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]{3,50}\)/gi) ?? []).map(x => x.toLowerCase()))].slice(0, 30);
  const fonts = [...new Set([...(html.match(/font-family\s*:\s*([^;{}]{2,100})/gi) ?? []), ...(html.match(/fonts\.googleapis\.com\/css2\?family=[^"'\s]+/gi) ?? [])].map(x => x.replace(/^font-family\s*:\s*/i, "").trim()))].slice(0, 12);
  const priority = ["Logo", "Ikon", "Banner / toppgrafikk", "Delingsgrafikk", "Produkt / galleri", "Bilde / foto"];
  const assets = [...found.values()].sort((a, b) => {
    const ai = priority.indexOf(a.category); const bi = priority.indexOf(b.category);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });
  return { assets: assets.slice(0, 100), colors, fonts };
}
export async function POST(request: NextRequest) {
  let context: Awaited<ReturnType<typeof requireOrg>>;
  try { context = await requireOrg(); } catch { return NextResponse.json({ error: "Du må være logget inn og ha en tilknyttet bedrift." }, { status: 401 }); }
  const { supabase, org } = context;
  let body: { action?: string; website?: string; selected?: { url: string; name: string; category: string }[] };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Ugyldig forespørsel." }, { status: 400 }); }

  try {
    if (body.action === "analyze") {
      if (typeof body.website !== "string" || body.website.length > 500) return NextResponse.json({ error: "Skriv inn en gyldig nettadresse." }, { status: 400 });
      const input = body.website.trim();
      const start = /^https?:\/\//i.test(input) ? input : "https://" + input;
      const crawl = await crawlWebsite(start, async (url) => {
        const page = await fetchPublic(url, MAX_HTML, false, true);
        return { html: page.bytes.toString("utf8"), url: page.url };
      });
      if (!crawl.pages.length) {
        const reason = crawl.failures[0]?.error || "Fant ingen tilgjengelige sider.";
        throw new Error(reason);
      }
      const assets = new Map<string, { url: string; name: string; category: string; sourcePage: string }>();
      const colors = new Set<string>();
      const fonts = new Set<string>();
      for (const crawledPage of crawl.pages) {
        const parsed = candidatesFromHtml(crawledPage.html, crawledPage.url);
        for (const asset of parsed.assets) {
          if (!assets.has(asset.url)) assets.set(asset.url, { ...asset, sourcePage: crawledPage.url });
        }
        parsed.colors.forEach(color => colors.add(color));
        parsed.fonts.forEach(font => fonts.add(font));
      }
      return NextResponse.json({
        website: start,
        assets: [...assets.values()].slice(0, 100),
        colors: [...colors].slice(0, 60),
        fonts: [...fonts].slice(0, 30),
        pages: crawl.pages.map(page => ({ url: page.url, depth: page.depth })),
        failures: crawl.failures.slice(0, 10),
        limits: crawl.limits,
      });
    }
    if (body.action === "import") {
      if (!Array.isArray(body.selected) || body.selected.length < 1 || body.selected.length > 15) return NextResponse.json({ error: "Velg mellom 1 og 15 bilder." }, { status: 400 });
      let total = 0; const imported: string[] = []; const failures: string[] = [];
      for (const item of body.selected) {
        try {
          const file = await fetchPublic(item.url, MAX_IMAGE, true);
          total += file.bytes.length;
          if (total > MAX_TOTAL) throw new Error("Samlet import kan maksimalt være 8 MB.");
          const ext = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" } as Record<string,string>)[file.type];
          const name = (item.name || "nettsidebilde").replace(/[^a-zA-Z0-9æøåÆØÅ._-]/gi, "_").slice(0, 80) + "." + ext;
          const path = org.id + "/" + crypto.randomUUID() + "-" + name;
          const { error: uploadError } = await supabase.storage.from("brand-assets").upload(path, file.bytes, { contentType: file.type, upsert: false });
          if (uploadError) throw new Error(uploadError.message);
          const kind = /logo|merke/i.test(item.category + " " + item.name) ? "logo" : "image";
          const { error: dbError } = await supabase.from("brand_assets").insert({ org_id: org.id, kind, original_name: name, storage_path: path, mime_type: file.type, file_size: file.bytes.length, is_primary: false });
          if (dbError) { await supabase.storage.from("brand-assets").remove([path]); throw new Error(dbError.message); }
          imported.push(name);
        } catch (error) { failures.push((item.name || "Bilde") + ": " + (error instanceof Error ? error.message : "Import feilet")); }
      }
      return NextResponse.json({ imported, failures, count: imported.length });
    }
    return NextResponse.json({ error: "Ukjent handling." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nettsiden kunne ikke analyseres." }, { status: 400 });
  }
}
