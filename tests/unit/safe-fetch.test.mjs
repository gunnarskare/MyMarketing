// Tester at serveren ikke kan lures til å hente fra interne adresser.
// Kjør med: npm run test:unit
import assert from "node:assert/strict";
import net from "node:net";
import { test } from "node:test";
import { assertPublicUrl, isPublicAddress, publicOnlyLookup, safeFetch } from "../../src/lib/safe-fetch.ts";

const resolveTo = (...addresses) => async () => addresses.map((address) => ({ address }));

test("private, reserverte og spesielle adresser regnes ikke som offentlige", () => {
  for (const ip of [
    "127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1",
    "0.0.0.0", "255.255.255.255", "224.0.0.1", "198.18.0.1", "192.0.2.10",
    "::1", "::", "::ffff:127.0.0.1", "::ffff:10.0.0.1", "fc00::1", "fd12:3456::1", "fe80::1", "ff02::1",
    "64:ff9b::a00:1", "2002:a00:1::", "2001:db8::1", "ikke-en-ip",
  ]) assert.equal(isPublicAddress(ip), false, ip);
  for (const ip of ["93.184.215.14", "8.8.8.8", "1.1.1.1", "2606:4700:4700::1111", "2a00:1450:4010:c02::8b"]) {
    assert.equal(isPublicAddress(ip), true, ip);
  }
});

test("bare vanlige https-adresser på det åpne nettet godtas", async () => {
  const pub = resolveTo("93.184.215.14");
  assert.equal((await assertPublicUrl("https://bakeri.no/om-oss", undefined, pub)).hostname, "bakeri.no");
  for (const bad of [
    "http://bakeri.no/", "https://bakeri.no:8443/", "https://user:pass@bakeri.no/", "ftp://bakeri.no/",
    "https://localhost/", "https://printer.local/", "https://intranet/", "https://db.internal/",
    "https://127.0.0.1/", "https://[::1]/", "https://169.254.169.254/latest/meta-data", "https://[::ffff:7f00:1]/",
    "https://10.0.0.5/", "javascript:alert(1)", "ikke en adresse",
  ]) {
    await assert.rejects(assertPublicUrl(bad, undefined, pub), undefined, bad);
  }
});

test("domener som peker innover avvises, også når bare én av adressene er privat", async () => {
  await assert.rejects(assertPublicUrl("https://lur.example.com/", undefined, resolveTo("127.0.0.1")), /privat/);
  await assert.rejects(assertPublicUrl("https://lur.example.com/", undefined, resolveTo("93.184.215.14", "10.0.0.1")), /privat/);
  await assert.rejects(assertPublicUrl("https://lur.example.com/", undefined, resolveTo()), /privat/);
});

test("forbigående DNS-feil prøves på nytt", async () => {
  let calls = 0;
  const flaky = async () => {
    calls++;
    if (calls < 3) throw Object.assign(new Error("busy"), { code: "EAI_AGAIN" });
    return [{ address: "93.184.215.14" }];
  };
  await assertPublicUrl("https://bakeri.no/", undefined, flaky);
  assert.equal(calls, 3);
});

test("nettverkskoblingen nekter å koble til private adresser selv om navnet slipper gjennom", async () => {
  // localhost slås opp lokalt (uten nettverk) til 127.0.0.1 eller ::1.
  const error = await new Promise((resolve) => {
    const socket = net.connect({ host: "localhost", port: 443, lookup: publicOnlyLookup });
    socket.on("connect", () => { socket.destroy(); resolve(null); });
    socket.on("error", resolve);
  });
  assert.ok(error, "koblingen skulle feilet");
  assert.match(String(error.message), /privat/);
});

test("safeFetch avviser interne adresser før noe sendes", async () => {
  await assert.rejects(safeFetch("https://localhost/", { maxBytes: 1000, types: ["text/html"] }), /lokalt|internt/);
  await assert.rejects(safeFetch("https://127.0.0.1/", { maxBytes: 1000, types: ["text/html"] }), /privat/);
  await assert.rejects(safeFetch("http://bakeri.no/", { maxBytes: 1000, types: ["text/html"] }), /https/);
});
