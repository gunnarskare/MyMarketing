// Går gjennom en nettside og henter de viktigste sidene. Selve hentingen gjøres av
// fetchPage, så denne filen har ingen nettverkskode og kan testes direkte (tests/unit).

export type CrawledPage = { url: string; html: string; depth: number };
export type CrawlFailure = { url: string; error: string };
export type CrawlOptions = { maxPages?: number; maxDepth?: number; concurrency?: number; timeBudgetMs?: number };
export type CrawlResult = {
  pages: CrawledPage[];
  failures: CrawlFailure[];
  /** Adressen forsiden endte på etter eventuelle videresendinger. */
  homepage: string;
  limits: { maxPages: number; maxDepth: number };
  stoppedEarly: boolean;
};

const SKIP_PATH = /\/(wp-admin|wp-login|wp-json|cart|handlekurv|checkout|kasse|account|min-side|login|logg-inn|search|sok|tag|author|feed|cdn-cgi)(\/|$)/i;
const SKIP_FILE = /\.(?:pdf|zip|rar|docx?|xlsx?|pptx?|mp4|mp3|mov|avi|webm|jpe?g|png|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot|css|js|json|xml|txt)(?:[?#]|$)/i;
// Sider som sier mest om bedriften kommer først.
const IMPORTANT = /(om-oss|om_oss|omoss|about|hvem-er-vi|tjenester|services|produkter|products|tilbud|meny|menu|priser|pricing|kontakt|contact|referanser|kunder|cases|portfolio|prosjekter)/i;

export function normalizePageUrl(raw: string, base: string, origin: string): string | null {
  try {
    const url = new URL(raw, base);
    if (url.protocol !== "https:" || url.origin !== origin || url.username || url.password) return null;
    url.hash = "";
    if (SKIP_FILE.test(url.pathname) || SKIP_PATH.test(url.pathname)) return null;
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|gclid$|fbclid$|mc_|_ga$|ref$)/i.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return null;
  }
}

/** Lavere tall = viktigere side. */
export function pagePriority(raw: string): number {
  const url = new URL(raw);
  const depth = url.pathname.split("/").filter(Boolean).length;
  return depth * 10 + (IMPORTANT.test(url.pathname) ? -15 : 0) + (url.search ? 5 : 0) + (/\d{4}\/\d{2}/.test(url.pathname) ? 20 : 0);
}

export function sitemapLocations(xml: string, baseUrl: string): string[] {
  const origin = new URL(baseUrl).origin;
  const urls = new Set<string>();
  for (const match of xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]]+?)\s*(?:\]\]>)?\s*<\/loc>/gi)) {
    const normalized = normalizePageUrl(match[1].trim().replace(/&amp;/g, "&"), baseUrl, origin);
    if (normalized) urls.add(normalized);
    if (urls.size >= 500) break;
  }
  return [...urls];
}

export function sitemapIndexLocations(xml: string, baseUrl: string): string[] {
  if (!/<sitemapindex\b/i.test(xml)) return [];
  const origin = new URL(baseUrl).origin;
  const urls = new Set<string>();
  for (const match of xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]]+?)\s*(?:\]\]>)?\s*<\/loc>/gi)) {
    try {
      const url = new URL(match[1].trim().replace(/&amp;/g, "&"), baseUrl);
      if (url.protocol === "https:" && url.origin === origin) urls.add(url.toString());
    } catch { /* ugyldig adresse i sitemap */ }
    if (urls.size >= 5) break;
  }
  return [...urls];
}

export function internalPageLinks(html: string, pageUrl: string): string[] {
  const origin = new URL(pageUrl).origin;
  const links = new Set<string>();
  for (const match of html.matchAll(/<a\b([^>]{0,5000})>/gi)) {
    const href = match[1].match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1] ?? match[1].match(/\bhref\s*=\s*([^\s>]+)/i)?.[1];
    if (!href || /^(?:mailto:|tel:|javascript:|#)/i.test(href)) continue;
    const normalized = normalizePageUrl(href.replace(/&amp;/g, "&"), pageUrl, origin);
    if (normalized && normalized !== pageUrl) links.add(normalized);
  }
  return [...links];
}

export async function crawlWebsite(
  startUrl: string,
  fetchPage: (url: string) => Promise<{ html: string; url: string }>,
  options: CrawlOptions = {},
): Promise<CrawlResult> {
  const maxPages = options.maxPages ?? 10;
  const maxDepth = options.maxDepth ?? 2;
  const concurrency = options.concurrency ?? 4;
  const deadline = Date.now() + (options.timeBudgetMs ?? 20_000);
  const failures: CrawlFailure[] = [];
  const pages: CrawledPage[] = [];
  const result = (homepage: string, stoppedEarly: boolean): CrawlResult =>
    ({ pages, failures, homepage, limits: { maxPages, maxDepth }, stoppedEarly });

  // Forsiden først. Sender den videre (for eksempel til www), gjelder den nye adressen.
  let first: { html: string; url: string };
  try {
    first = await fetchPage(new URL(startUrl).toString());
  } catch (error) {
    failures.push({ url: startUrl, error: error instanceof Error ? error.message : "Kunne ikke hente siden." });
    return result(startUrl, false);
  }
  const origin = new URL(first.url).origin;
  const homepage = normalizePageUrl(first.url, first.url, origin) ?? first.url;
  pages.push({ url: homepage, html: first.html, depth: 0 });

  const seen = new Set<string>([homepage, new URL("/", origin).toString()]);
  let queue: { url: string; depth: number }[] = [];
  const enqueue = (url: string, depth: number) => {
    if (seen.has(url) || depth > maxDepth) return;
    seen.add(url);
    queue.push({ url, depth });
  };
  for (const link of internalPageLinks(first.html, homepage)) enqueue(link, 1);

  // Sitemap gir ofte sider som ikke lenkes fra forsiden.
  if (Date.now() < deadline) {
    try {
      const sitemap = await fetchPage(new URL("/sitemap.xml", origin).toString());
      const documents = [sitemap];
      for (const nested of sitemapIndexLocations(sitemap.html, sitemap.url).slice(0, 3)) {
        try { documents.push(await fetchPage(nested)); } catch { /* hopp over den ene */ }
      }
      for (const document of documents) {
        for (const url of sitemapLocations(document.html, document.url)) enqueue(url, 1);
      }
    } catch {
      // Mange små nettsider har ikke sitemap. Lenkene på sidene holder.
    }
  }

  while (queue.length && pages.length < maxPages) {
    if (Date.now() >= deadline) return result(homepage, true);
    queue.sort((a, b) => a.depth - b.depth || pagePriority(a.url) - pagePriority(b.url));
    const batch = queue.slice(0, Math.min(concurrency, maxPages - pages.length));
    queue = queue.slice(batch.length);
    const fetched = await Promise.all(batch.map(async (item) => {
      try {
        return { item, page: await fetchPage(item.url) };
      } catch (error) {
        failures.push({ url: item.url, error: error instanceof Error ? error.message : "Kunne ikke hente siden." });
        return null;
      }
    }));
    for (const entry of fetched) {
      if (!entry || pages.length >= maxPages) continue;
      const canonical = normalizePageUrl(entry.page.url, homepage, origin) ?? entry.item.url;
      if (pages.some((page) => page.url === canonical)) continue;
      pages.push({ url: canonical, html: entry.page.html, depth: entry.item.depth });
      if (entry.item.depth < maxDepth) {
        for (const link of internalPageLinks(entry.page.html, canonical)) enqueue(link, entry.item.depth + 1);
      }
    }
  }
  return result(homepage, false);
}
