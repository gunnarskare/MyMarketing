// Tester uttrekk av bilder, farger og skrifttyper fra HTML og CSS.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  countColors, countFonts, imageCandidatesFromCss, imageCandidatesFromHtml, rankColors, rankFonts, sanitizeSvg, stylesheetUrls,
} from "../../src/lib/brand-assets-extract.ts";

const page = "https://bakeri.no/";

test("finner logo, bilder, srcset, delingsbilde og logo fra strukturerte data", () => {
  const html = `
    <img src="/img/logo.svg" alt="Testbakeriet logo">
    <img data-src="/img/brod.webp" alt="Brød" srcset="/img/brod-2x.webp 2x, /img/brod-3x.webp 3x">
    <img src="data:image/png;base64,AAAA">
    <meta property="og:image" content="https://bakeri.no/del.jpg">
    <link rel="apple-touch-icon" href="/ikon.png">
    <script type="application/ld+json">{"@type":"Organization","logo":"https:\\/\\/bakeri.no\\/merke.png"}</script>
    <div style="background-image:url('/img/topp.jpg')"></div>`;
  const found = imageCandidatesFromHtml(html, page);
  const byUrl = Object.fromEntries(found.map((a) => [a.url, a.category]));
  assert.equal(byUrl["https://bakeri.no/img/logo.svg"], "Logo");
  assert.equal(byUrl["https://bakeri.no/merke.png"], "Logo");
  assert.equal(byUrl["https://bakeri.no/ikon.png"], "Ikon");
  assert.equal(byUrl["https://bakeri.no/del.jpg"], "Delingsgrafikk");
  assert.ok(byUrl["https://bakeri.no/img/brod-2x.webp"]);
  assert.ok(byUrl["https://bakeri.no/img/topp.jpg"]);
  assert.ok(!found.some((a) => a.url.startsWith("data:")));
  assert.equal(found[0].category, "Logo", "logoer sorteres først");
});

test("stilark: Google Fonts-lenker hoppes over, bakgrunnsbilder fra CSS finnes", () => {
  const html = `<link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">`;
  assert.deepEqual(stylesheetUrls(html, page), ["https://bakeri.no/style.css"]);
  const css = `.hero{background:url(../bilder/hero.jpg)} .x{background:url(data:image/png;base64,AA)} .logo{background:url("/brand/logo.png")}`;
  const assets = imageCandidatesFromCss(css, "https://bakeri.no/css/style.css");
  assert.deepEqual(assets.map((a) => a.url), ["https://bakeri.no/bilder/hero.jpg", "https://bakeri.no/brand/logo.png"]);
  assert.equal(assets[1].category, "Logo");
});

test("farger telles i fargeegenskaper, merkevarefarger kommer foran nøytrale", () => {
  const css = `
    :root{--brand:#DC2F25;--ink:#101b3b}
    body{color:#333;background:#fff}
    .a{color:#dc2f25} .b{background-color:rgb(220, 47, 37)} .c{border:1px solid #157a4b}
    .skygge{box-shadow:0 0 4px rgba(0,0,0,.2)}
    a[href="#fff123"]{} .ikke-farge{width:100px}`;
  const ranked = rankColors(countColors(css));
  assert.equal(ranked[0].hex, "#dc2f25");
  assert.equal(ranked[0].count, 3);
  assert.ok(ranked.some((c) => c.hex === "#157a4b"));
  const neutral = ranked.filter((c) => c.neutral).map((c) => c.hex);
  assert.ok(neutral.includes("#ffffff") && neutral.includes("#333333"));
  assert.ok(ranked.findIndex((c) => c.neutral) > ranked.findIndex((c) => c.hex === "#157a4b"));
  assert.ok(!ranked.some((c) => c.hex === "#fff123"), "attributter er ikke farger");
});

test("skrifttyper: første navn i stabelen, Google Fonts-familier, ikke ikonfonter eller systemfonter", () => {
  const source = `
    body{font-family:"DM Sans", Arial, sans-serif}
    h1{font-family:'Playfair Display',serif} h2{font-family:'Playfair Display',serif}
    .ikon{font-family:"Font Awesome 6 Free"} .sys{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto}
    .v{font-family:var(--font)}
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;700&amp;family=Space+Grotesk&display=swap">`;
  const fonts = rankFonts(countFonts(source));
  assert.equal(fonts[0], "Playfair Display");
  for (const name of ["DM Sans", "Manrope", "Space Grotesk"]) assert.ok(fonts.includes(name), name);
  for (const name of ["Font Awesome 6 Free", "-apple-system", "sans-serif", "var(--font)"]) assert.ok(!fonts.includes(name), name);
});

test("SVG renses for skript og eksterne lenker, men beholder stil og interne referanser", () => {
  const dirty = `<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]>
    <svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">
      <style>.a{fill:#dc2f25} @import url(https://evil.example/x.css);</style>
      <script>alert(1)</script><foreignObject><div>x</div></foreignObject>
      <image href="https://evil.example/spor.png"/><use href="#form"/>
      <rect class="a" style="fill:url(https://evil.example/f)"/></svg>`;
  const clean = sanitizeSvg(dirty);
  for (const bad of ["<script", "onload", "foreignObject", "evil.example", "ENTITY", "DOCTYPE"]) assert.ok(!clean.includes(bad), bad);
  assert.ok(clean.includes(".a{fill:#dc2f25}"));
  assert.ok(clean.includes('href="#form"'));
  assert.throws(() => sanitizeSvg("<html>ikke svg</html>"));
});
