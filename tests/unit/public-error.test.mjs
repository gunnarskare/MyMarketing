import assert from "node:assert/strict";
import { test } from "node:test";
import { isTimeout, PublicError, publicMessage } from "../../src/lib/public-error.ts";

test("bare meldinger skrevet for brukeren slipper ut", () => {
  assert.equal(publicMessage(new PublicError("Fant ikke domenet."), "Prøv igjen."), "Fant ikke domenet.");
  assert.equal(publicMessage(new Error("401 Incorrect API key provided: sk-abc"), "Prøv igjen."), "Prøv igjen.");
  assert.equal(publicMessage("noe rart", "Prøv igjen."), "Prøv igjen.");
});

test("tidsavbrudd kjennes igjen uansett hvem som melder det", () => {
  assert.equal(isTimeout(new Error("Request was aborted.")), true);
  assert.equal(isTimeout(Object.assign(new Error("x"), { name: "TimeoutError" })), true);
  assert.equal(isTimeout(new Error("Kunne ikke lagre innleggene.")), false);
  assert.equal(isTimeout(null), false);
});
