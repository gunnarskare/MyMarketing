// Tester crawleren med en falsk nettside i minnet.
import assert from "node:assert/strict";
import { test } from "node:test";
import { crawlWebsite, internalPageLinks, pagePriority, sitemapLocations } from "../../src/lib/brand-crawler.ts";

function site(pages, redirects = {}) {
  const calls = [];
  const fetchPage = async (url) => {
    calls.push(url);
    const target = redirects[url] ?? url;
    if (!(target in pages)) throw new Error("404");
    return { html: pages[target], url: target };
  };
  return { fetchPage, calls };
}

const nav = (...paths) => paths.map((p) => `<a href="${p}">${p}</a>`).join("");

test("følger forsiden når den sender videre til www, og henter undersider derfra", async () => {
  const { fetchPage } = site({
    "https://www.bakeri.no/": nav("https://www.bakeri.no/om-oss", "/kontakt"),
    "https://www.bakeri.no/om-oss": "Om oss",
    "https://www.bakeri.no/kontakt": "Kontakt",
  }, { "https://bakeri.no/": "https://www.bakeri.no/" });
  const result = await crawlWebsite("https://bakeri.no/", fetchPage);
  assert.equal(result.homepage, "https://www.bakeri.no/");
  assert.deepEqual(result.pages.map((p) => p.url).sort(), [
    "https://www.bakeri.no/", "https://www.bakeri.no/kontakt", "https://www.bakeri.no/om-oss",
  ]);
});

test("henter aldri flere sider enn grensen, og viktige sider først", async () => {
  const blog = Array.from({ length: 30 }, (_, i) => `/2024/05/innlegg-${i}`);
  const pages = { "https://bakeri.no/": nav(...blog, "/om-oss", "/tjenester", "/kontakt") };
  for (const path of [...blog, "/om-oss", "/tjenester", "/kontakt"]) pages["https://bakeri.no" + path] = "side";
  const { fetchPage } = site(pages);
  const result = await crawlWebsite("https://bakeri.no/", fetchPage, { maxPages: 5 });
  assert.equal(result.pages.length, 5);
  const urls = result.pages.map((p) => p.url);
  for (const important of ["/om-oss", "/tjenester", "/kontakt"]) assert.ok(urls.includes("https://bakeri.no" + important), important);
});

test("bruker sitemap og sitemap-indeks, og registrerer sider som feiler", async () => {
  const { fetchPage } = site({
    "https://bakeri.no/": "forside uten lenker",
    "https://bakeri.no/sitemap.xml": `<sitemapindex><sitemap><loc>https://bakeri.no/sider.xml</loc></sitemap></sitemapindex>`,
    "https://bakeri.no/sider.xml": `<urlset><url><loc>https://bakeri.no/produkter</loc></url><url><loc><![CDATA[https://bakeri.no/borte]]></loc></url></urlset>`,
    "https://bakeri.no/produkter": "produkter",
  });
  const result = await crawlWebsite("https://bakeri.no/", fetchPage);
  assert.ok(result.pages.some((p) => p.url === "https://bakeri.no/produkter"));
  assert.ok(result.failures.some((f) => f.url === "https://bakeri.no/borte"));
});

test("stopper når tidsbudsjettet er brukt opp", async () => {
  const pages = { "https://bakeri.no/": nav("/a", "/b", "/c", "/d", "/e", "/f") };
  for (const p of ["a", "b", "c", "d", "e", "f"]) pages["https://bakeri.no/" + p] = nav("/" + p + "/mer");
  const slow = async (url) => {
    await new Promise((r) => setTimeout(r, 30));
    if (!(url in pages)) throw new Error("404");
    return { html: pages[url], url };
  };
  const result = await crawlWebsite("https://bakeri.no/", slow, { timeBudgetMs: 50, concurrency: 1 });
  assert.equal(result.stoppedEarly, true);
  assert.ok(result.pages.length < 7);
});

test("forsiden som feiler gir en tydelig feil i stedet for å krasje", async () => {
  const result = await crawlWebsite("https://borte.no/", async () => { throw new Error("Fikk ikke kontakt med nettsiden."); });
  assert.equal(result.pages.length, 0);
  assert.equal(result.failures[0].error, "Fikk ikke kontakt med nettsiden.");
});

test("lenker til filer, innlogging, andre domener og sporingsparametere filtreres", () => {
  const links = internalPageLinks(
    nav("/om-oss?utm_source=x", "/meny.pdf", "/wp-admin/", "https://annen.no/", "mailto:a@b.no", "#topp", "/kontakt/"),
    "https://bakeri.no/",
  );
  assert.deepEqual(links.sort(), ["https://bakeri.no/kontakt", "https://bakeri.no/om-oss"]);
  assert.deepEqual(sitemapLocations("<loc>https://annen.no/x</loc><loc>https://bakeri.no/a&amp;b</loc>", "https://bakeri.no/"), ["https://bakeri.no/a&b"]);
  assert.ok(pagePriority("https://bakeri.no/om-oss") < pagePriority("https://bakeri.no/2024/05/nyhet"));
});
