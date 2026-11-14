import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { claimQuota } from "@/lib/ai/quota";
import { requireOrg } from "@/lib/auth";
import {
  countColors, countFonts, imageCandidatesFromCss, imageCandidatesFromHtml, rankColors, rankFonts, sanitizeSvg, stylesheetUrls,
  type AssetCandidate,
} from "@/lib/brand-assets-extract";
import { storeBrandAsset } from "@/lib/brand-assets";
import { crawlWebsite } from "@/lib/brand-crawler";
import { fetchPublicHtml } from "@/lib/brand-crawler-fetch";
import { normalizeWebsiteUrl } from "@/lib/brand-profile";
import { safeFetch } from "@/lib/safe-fetch";

export const maxDuration = 90;

const MAX_IMAGE = 5_000_000;
const MAX_CSS = 1_000_000;
const MAX_TOTAL = 15_000_000;
const MAX_IMPORT = 15;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/svg+xml"] as const;
const EXTENSION: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

type AnalyzeBody = { action: "analyze"; website: unknown };
type ImportBody = { action: "import"; selected: unknown };

function isCandidate(value: unknown): value is AssetCandidate {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.url === "string" && item.url.length <= 2000 && typeof item.name === "string" && item.name.length <= 200
    && typeof item.category === "string" && item.category.length <= 60;
}

/** SVG lagres ikke direkte: den renses og gjøres om til PNG, så biblioteket bare har trygge bildefiler. */
async function svgToPng(svg: Buffer): Promise<Buffer> {
  const clean = Buffer.from(sanitizeSvg(svg.toString("utf8")), "utf8");
  return sharp(clean, { density: 300, limitInputPixels: 40_000_000 })
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();
}

function parseWebsite(website: unknown): string | null {
  if (typeof website !== "string" || website.length > 500) return null;
  return normalizeWebsiteUrl(website.trim().replace(/^http:\/\//i, "https://")) ?? null;
}

async function analyze(start: string) {
  const crawl = await crawlWebsite(start, fetchPublicHtml, { maxPages: 10, timeBudgetMs: 25_000 });
  if (!crawl.pages.length) throw new Error(crawl.failures[0]?.error || "Fant ingen sider på nettsiden.");

  const assets = new Map<string, AssetCandidate & { sourcePage: string }>();
  const colors = new Map<string, number>();
  const fonts = new Map<string, number>();
  // De fleste sider bruker de samme stilarkene, så hvert stilark hentes bare én gang.
  const stylesheets = new Map<string, Promise<{ css: string; url: string } | null>>();
  const loadCss = (url: string) => {
    if (!stylesheets.has(url)) {
      stylesheets.set(url, safeFetch(url, { maxBytes: MAX_CSS, types: ["text/css"], timeoutMs: 4_000 })
        .then((file) => ({ css: file.bytes.toString("utf8"), url: file.url }))
        .catch(() => null));
    }
    return stylesheets.get(url)!;
  };

  for (const page of crawl.pages) {
    const candidates = imageCandidatesFromHtml(page.html, page.url);
    countColors(page.html, colors);
    countFonts(page.html, fonts);
    for (const sheetUrl of stylesheetUrls(page.html, page.url)) {
      if (stylesheets.size >= 8 && !stylesheets.has(sheetUrl)) break;
      const sheet = await loadCss(sheetUrl);
      if (!sheet) continue;
      candidates.push(...imageCandidatesFromCss(sheet.css, sheet.url));
    }
    for (const candidate of candidates) {
      if (!assets.has(candidate.url)) assets.set(candidate.url, { ...candidate, sourcePage: page.url });
    }
  }
  // Farger og fonter telles én gang per stilark, ikke én gang per side som bruker det.
  for (const sheet of await Promise.all(stylesheets.values())) {
    if (!sheet) continue;
    countColors(sheet.css, colors);
    countFonts(sheet.css, fonts);
  }

  return {
    website: crawl.homepage,
    assets: [...assets.values()].slice(0, 100),
    colors: rankColors(colors),
    fonts: rankFonts(fonts),
    pages: crawl.pages.map((page) => ({ url: page.url, depth: page.depth })),
    failures: crawl.failures.slice(0, 10),
    limits: crawl.limits,
    stoppedEarly: crawl.stoppedEarly,
  };
}

export async function POST(request: NextRequest) {
  let context: Awaited<ReturnType<typeof requireOrg>>;
  try {
    context = await requireOrg();
  } catch {
    return NextResponse.json({ error: "Du må være logget inn og ha en bedrift." }, { status: 401 });
  }
  const { supabase, org } = context;

  let body: AnalyzeBody | ImportBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørsel." }, { status: 400 });
  }

  if (body?.action === "analyze") {
    const start = parseWebsite(body.website);
    if (!start) return NextResponse.json({ error: "Skriv inn en gyldig nettadresse, for eksempel dinbedrift.no." }, { status: 400 });
    const quota = await claimQuota(supabase, org.id, "website_import");
    if (!quota.allowed) return NextResponse.json({ error: quota.message }, { status: 429 });
    try {
      return NextResponse.json(await analyze(start));
    } catch (error) {
      console.error("Website analysis failed:", error instanceof Error ? error.message : "Unknown error");
      return NextResponse.json({ error: error instanceof Error ? error.message : "Nettsiden kunne ikke analyseres." }, { status: 400 });
    }
  }

  if (body?.action === "import") {
    const selected = Array.isArray(body.selected) ? body.selected.filter(isCandidate) : [];
    if (selected.length < 1 || selected.length > MAX_IMPORT || selected.length !== (body.selected as unknown[]).length) {
      return NextResponse.json({ error: `Velg mellom 1 og ${MAX_IMPORT} filer.` }, { status: 400 });
    }
    let total = 0;
    const imported: string[] = [];
    const duplicates: string[] = [];
    const failures: string[] = [];
    const importOne = async (item: AssetCandidate) => {
      const label = item.name || "Bilde";
      try {
        const fetched = await safeFetch(item.url, { maxBytes: MAX_IMAGE, types: IMAGE_TYPES, accept: "image/*", timeoutMs: 8_000 });
        const isSvg = fetched.type === "image/svg+xml";
        const bytes = isSvg ? await svgToPng(fetched.bytes) : fetched.bytes;
        const mime = isSvg ? "image/png" : fetched.type;
        total += bytes.length;
        if (total > MAX_TOTAL) throw new Error("Samlet import kan være maks 15 MB om gangen.");
        const base = (item.name || "nettsidebilde").replace(/\.(jpe?g|png|webp|avif|svg)$/i, "").slice(0, 70);
        const name = `${base}.${EXTENSION[mime]}`;
        const kind = item.category === "Logo" || /\blogo\b/i.test(item.name) ? "logo" : "image";
        const result = await storeBrandAsset(supabase, { orgId: org.id, kind, name, bytes, mime });
        if (result.status === "duplicate") duplicates.push(label);
        else imported.push(name);
      } catch (error) {
        failures.push(`${label}: ${error instanceof Error ? error.message : "Importen feilet."}`);
      }
    };
    // Tre om gangen: raskt nok til å bli ferdig innen tidsgrensen, uten å belaste kundens nettside.
    const queue = [...selected];
    await Promise.all(Array.from({ length: 3 }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) await importOne(item);
    }));
    return NextResponse.json({ imported, duplicates, failures, count: imported.length });
  }

  return NextResponse.json({ error: "Ukjent handling." }, { status: 400 });
}
