export type CrawledPage = { url: string; html: string; depth: number };
export type CrawlFailure = { url: string; error: string };

const MAX_PAGES = 10;
const MAX_DEPTH = 2;
const SKIP_PATH = /\/(wp-admin|wp-login|cart|checkout|account|login|search|tag|author)(\/|$)/i;
const SKIP_FILE = /\.(?:pdf|zip|mp4|mp3|mov|woff2?|ttf|eot|css|js)(?:[?#]|$)/i;

function normalizePageUrl(raw: string, base: string, origin: string) {
  try {
    const url = new URL(raw, base);
    if (url.protocol !== "https:" || url.origin !== origin || url.username || url.password) return null;
    url.hash = "";
    if (SKIP_FILE.test(url.pathname) || SKIP_PATH.test(url.pathname)) return null;
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    // Ignore common tracking parameters while retaining meaningful query strings.
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|gclid$|fbclid$|mc_)/i.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch { return null; }
}

export function sitemapLocations(xml: string, baseUrl: string) {
  const origin = new URL(baseUrl).origin;
  const urls = new Set<string>();
  for (const match of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)) {
    const normalized = normalizePageUrl(match[1].trim(), baseUrl, origin);
    if (normalized) urls.add(normalized);
    if (urls.size >= 500) break;
  }
  return [...urls];
}

export function internalPageLinks(html: string, pageUrl: string) {
  const origin = new URL(pageUrl).origin;
  const links = new Set<string>();
  for (const match of html.matchAll(/<a\b([^>]{0,5000})>/gi)) {
    const href = match[1].match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1]
      ?? match[1].match(/\bhref\s*=\s*([^\s>]+)/i)?.[1];
    if (!href || /^(?:mailto:|tel:|javascript:|#)/i.test(href)) continue;
    const normalized = normalizePageUrl(href, pageUrl, origin);
    if (normalized && normalized !== pageUrl) links.add(normalized);
  }
  return [...links];
}

export async function crawlWebsite(
  startUrl: string,
  fetchPage: (url: string) => Promise<{ html: string; url: string }>,
) {
  const start = new URL(startUrl);
  const origin = start.origin;
  const homepage = start.toString();
  const queue: { url: string; depth: number }[] = [{ url: homepage, depth: 0 }];
  const queued = new Set([homepage]);
  const visited = new Set<string>();
  const pages: CrawledPage[] = [];
  const failures: CrawlFailure[] = [];

  // Sitemap is an efficient source of deep pages. Keep it same-origin and bounded.
  try {
    const sitemap = await fetchPage(new URL("/sitemap.xml", origin).toString());
    for (const url of sitemapLocations(sitemap.html, sitemap.url).slice(0, 200)) {
      if (!queued.has(url) && queued.size < MAX_PAGES * 3) {
        queued.add(url);
        queue.push({ url, depth: 1 });
      }
    }
  } catch {
    // Many small sites do not publish a sitemap; internal links are the fallback.
  }

  const worker = async () => {
    while (queue.length && pages.length < MAX_PAGES) {
      const current = queue.shift();
      if (!current || visited.has(current.url)) continue;
      visited.add(current.url);
      try {
        const result = await fetchPage(current.url);
        const canonical = normalizePageUrl(result.url, homepage, origin) ?? current.url;
        if (pages.some(page => page.url === canonical)) continue;
        pages.push({ url: canonical, html: result.html, depth: current.depth });
        if (current.depth < MAX_DEPTH) {
          for (const link of internalPageLinks(result.html, canonical)) {
            if (!queued.has(link) && queued.size < MAX_PAGES * 3) {
              queued.add(link);
              queue.push({ url: link, depth: current.depth + 1 });
            }
          }
        }
      } catch (error) {
        failures.push({ url: current.url, error: error instanceof Error ? error.message : "Kunne ikke hente siden." });
      }
    }
  };
  await Promise.all(Array.from({ length: 3 }, () => worker()));

  return { pages, failures, limits: { maxPages: MAX_PAGES, maxDepth: MAX_DEPTH } };
}
