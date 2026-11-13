// Henter filer fra offentlige nettsider på vegne av kunden, uten å kunne nå interne adresser.
//
// To lag med beskyttelse:
// 1. Adressen sjekkes før henting (bare https, port 443, ingen lokale navn eller private IP-er).
// 2. Selve nettverkskoblingen slår opp domenet med en egen funksjon som avviser private
//    adresser. Da hjelper det ikke å la domenet peke ut på nettet ved første oppslag og
//    innover ved det neste (DNS-rebinding).
//
// Ingen relative importer her, så filen kan testes direkte med Node (se tests/unit).
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { lookup as dnsLookupAsync } from "node:dns/promises";
import { BlockList, isIP, type LookupFunction } from "node:net";
import { Agent, fetch } from "undici";

const blocked = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16],
  ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of [
  ["::", 96], // uspesifisert, loopback og IPv4-kompatible adresser
  // IPv4 pakket inn i IPv6 (::ffff:a.b.c.d) sjekkes automatisk mot IPv4-reglene over.
  ["64:ff9b::", 96], ["64:ff9b:1::", 48], // NAT64 kan peke til private IPv4
  ["100::", 64], ["2001::", 23], ["2001:db8::", 32], ["2002::", 16],
  ["fc00::", 7], ["fe80::", 10], ["ff00::", 8],
] as const) blocked.addSubnet(network, prefix, "ipv6");

/** Sann bare for adresser på det offentlige internettet. */
export function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  if (!version) return false;
  try {
    return !blocked.check(address, version === 4 ? "ipv4" : "ipv6");
  } catch {
    return false;
  }
}

export class UnsafeUrlError extends Error {}

const PRIVATE_NAMES = /(^|\.)(localhost|local|internal|intranet|lan|home|corp|localdomain)$/i;
const TRANSIENT_DNS = new Set(["EBUSY", "EAI_AGAIN", "ETIMEOUT", "ESERVFAIL"]);

type Resolver = (host: string) => Promise<{ address: string }[]>;
const defaultResolver: Resolver = (host) => dnsLookupAsync(host, { all: true, verbatim: true });

/**
 * Kaster hvis adressen ikke er en offentlig https-adresse. Returnerer URL-en.
 * resolver kan byttes ut i tester.
 */
export async function assertPublicUrl(raw: string, base?: string, resolver: Resolver = defaultResolver): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw, base);
  } catch {
    throw new UnsafeUrlError("Adressen er ikke gyldig.");
  }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
    throw new UnsafeUrlError("Bare vanlige https-adresser på det åpne nettet støttes.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  if (!host || PRIVATE_NAMES.test(host) || (!isIP(host) && !host.includes("."))) {
    throw new UnsafeUrlError("Adressen peker mot et lokalt eller internt nettverk.");
  }
  if (isIP(host)) {
    if (!isPublicAddress(host)) throw new UnsafeUrlError("Adressen peker mot et privat eller reservert nettverk.");
    return url;
  }
  let records: { address: string }[] = [];
  for (let attempt = 0; ; attempt++) {
    try {
      records = await resolver(host);
      break;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code ?? "";
      if (TRANSIENT_DNS.has(code) && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
        continue;
      }
      if (TRANSIENT_DNS.has(code)) throw new Error("Navneoppslaget svarer ikke akkurat nå. Prøv igjen om litt.");
      throw new Error(`Fant ikke domenet ${host}.`);
    }
  }
  if (!records.length || records.some((record) => !isPublicAddress(record.address))) {
    throw new UnsafeUrlError("Adressen peker mot et privat eller reservert nettverk.");
  }
  return url;
}

/** Brukes av selve nettverkskoblingen. Avviser private adresser uansett hva domenet svarte sist. */
export const publicOnlyLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true, verbatim: true }, (error, addresses) => {
    if (error) return callback(error, "", 0);
    const list = addresses as unknown as LookupAddress[];
    if (!list.length || list.some((entry) => !isPublicAddress(entry.address))) {
      return callback(Object.assign(new UnsafeUrlError("Adressen peker mot et privat eller reservert nettverk."), { code: "EUNSAFEADDR" }), "", 0);
    }
    if (options.all) return (callback as unknown as (err: null, list: LookupAddress[]) => void)(null, list);
    callback(null, list[0].address, list[0].family);
  });
};

const agent = new Agent({ connect: { lookup: publicOnlyLookup, timeout: 5_000 } });

export type SafeFetchOptions = {
  maxBytes: number;
  /** Tillatte innholdstyper, for eksempel ["text/html"]. */
  types: readonly string[];
  accept?: string;
  timeoutMs?: number;
};

export type SafeFetchResult = { bytes: Buffer; type: string; url: string };

const REDIRECTS = new Set([301, 302, 303, 307, 308]);

export async function safeFetch(raw: string, options: SafeFetchOptions): Promise<SafeFetchResult> {
  let url = await assertPublicUrl(raw);
  for (let hop = 0; hop <= 4; hop++) {
    let response;
    try {
      response = await fetch(url, {
        dispatcher: agent,
        redirect: "manual",
        signal: AbortSignal.timeout(options.timeoutMs ?? 8_000),
        headers: {
          "User-Agent": "SpottBot/1.0 (+https://www.spott.no)",
          Accept: options.accept ?? options.types.join(","),
        },
      });
    } catch (error) {
      const cause = (error as { cause?: unknown }).cause;
      if (cause instanceof UnsafeUrlError) throw cause;
      if ((error as Error).name === "TimeoutError") throw new Error("Nettsiden brukte for lang tid på å svare.");
      throw new Error("Fikk ikke kontakt med nettsiden.");
    }
    if (REDIRECTS.has(response.status)) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) throw new Error("Nettsiden sendte videre uten å si hvor.");
      if (hop === 4) throw new Error("Nettsiden sendte videre for mange ganger.");
      url = await assertPublicUrl(location, url.toString());
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Nettsiden svarte med feilkode ${response.status}.`);
    }
    const type = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!options.types.includes(type)) {
      await response.body?.cancel();
      throw new Error(`Uventet filtype (${type || "ukjent"}).`);
    }
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > options.maxBytes) {
      await response.body?.cancel();
      throw new Error("Filen er større enn grensen.");
    }
    const chunks: Buffer[] = [];
    let size = 0;
    if (response.body) {
      for await (const chunk of response.body) {
        size += chunk.byteLength;
        if (size > options.maxBytes) {
          await response.body.cancel().catch(() => {});
          throw new Error("Filen er større enn grensen.");
        }
        chunks.push(Buffer.from(chunk));
      }
    }
    return { bytes: Buffer.concat(chunks), type, url: url.toString() };
  }
  throw new Error("Nettsiden sendte videre for mange ganger.");
}
