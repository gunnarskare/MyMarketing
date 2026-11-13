import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_HTML_BYTES = 1_500_000;
const PRIVATE_V4 = /^(0|10|127|169\\.254|172\\.(1[6-9]|2\\d|3[01])|192\\.168|100\\.(6[4-9]|[7-9]\\d|1[01]\\d|12[0-7]))\\./;

function isPublicIp(ip: string) {
  if (isIP(ip) === 4) return !PRIVATE_V4.test(ip) && ip !== "255.255.255.255";
  if (isIP(ip) === 6) {
    const value = ip.toLowerCase();
    return value !== "::1" && !(value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:") || value.startsWith("::ffff:"));
  }
  return false;
}

async function validatePublicHttps(raw: string, base?: string) {
  const url = new URL(raw, base);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
    throw new Error("Bare offentlige HTTPS-nettsider støttes.");
  }
  const host = url.hostname.toLowerCase().replace(/\\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Nettsiden peker mot et privat nettverk.");
  }
  const records = isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true });
  if (!records.length || records.some(record => !isPublicIp(record.address))) {
    throw new Error("Nettsiden peker mot et privat eller reservert nettverk.");
  }
  return url;
}

export async function fetchPublicHtml(raw: string) {
  let url = await validatePublicHttps(raw);
  for (let hop = 0; hop < 4; hop++) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
      headers: { "User-Agent": "SpottBrandAssistant/1.0", Accept: "text/html,application/xhtml+xml,application/xml,text/xml" },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Ugyldig videresending fra nettsiden.");
      url = await validatePublicHttps(location, url.toString());
      continue;
    }
    if (!response.ok) throw new Error("Nettsiden svarte med HTTP " + response.status + ".");
    const type = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!["text/html", "application/xhtml+xml", "application/xml", "text/xml"].includes(type)) {
      throw new Error("Nettsiden leverte ikke HTML.");
    }
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > MAX_HTML_BYTES) throw new Error("Nettsiden er større enn tillatt grense.");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Kunne ikke lese nettsiden.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_HTML_BYTES) {
        await reader.cancel();
        throw new Error("Nettsiden er større enn tillatt grense.");
      }
      chunks.push(value);
    }
    return { html: Buffer.concat(chunks.map(chunk => Buffer.from(chunk))).toString("utf8"), url: url.toString() };
  }
  throw new Error("For mange videresendinger.");
}

export function extractPageText(html: string) {
  const title = html.match(/<title\\b[^>]*>([\\s\\S]*?)<\\/title>/i)?.[1] ?? "";
  const description = html.match(/<meta\\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] ?? "";
  const text = html
    .replace(/<!--[\\s\\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|nav|footer|header)\\b[^>]*>[\\s\\S]*?<\\/\\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\\s+/g, " ")
    .trim();
  return [title && "Tittel: " + title, description && "Beskrivelse: " + description, text].filter(Boolean).join("\\n").slice(0, 12_000);
}
