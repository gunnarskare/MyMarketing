// Tester pristabellen og anslaget for hva ett AI-kall koster.
import assert from "node:assert/strict";
import { test } from "node:test";
import { estimateCostUsd, priceFor, tokenUsageFromSdk } from "../../src/lib/ai/pricing.ts";

const usage = (input, output, extra = {}) => ({
  inputTokens: input, outputTokens: output, cachedInputTokens: 0, cacheWrite30mTokens: 0, cacheWrite12hTokens: 0, ...extra,
});

test("standardmodellen og datoversjoner av den har pris, ukjente modeller har ikke", () => {
  assert.deepEqual(priceFor("gpt-5.6-luna"), priceFor("gpt-5.6-luna-2026-07-30"));
  assert.equal(priceFor("gpt-5.6-luna")?.input, 0.2);
  assert.equal(priceFor("finnes-ikke"), null);
  assert.equal(priceFor("constructor"), null);
  assert.equal(estimateCostUsd("finnes-ikke", usage(1000, 1000)), null);
});

test("kostnaden regnes per million tokens, med seks desimaler", () => {
  // gpt-5.6-luna: 0,20 USD inn og 1,20 USD ut per million.
  assert.equal(estimateCostUsd("gpt-5.6-luna", usage(1_000_000, 0)), 0.2);
  assert.equal(estimateCostUsd("gpt-5.6-luna", usage(0, 1_000_000)), 1.2);
  assert.equal(estimateCostUsd("gpt-5.6-luna", usage(12_000, 1_200)), 0.00384);
  assert.equal(estimateCostUsd("gpt-5.6-luna", usage(3, 0)), 0.000001);
  assert.equal(estimateCostUsd("gpt-5.6-luna", usage(0, 0)), 0);
});

test("hurtigbufferen: lest input er billigere, skrevet input dyrere", () => {
  // 10 000 lest fra bufferen (0,02), 10 000 skrevet med 12 timers levetid (0,50), 10 000 vanlig (0,20).
  const cost = estimateCostUsd("gpt-5.6-luna", usage(30_000, 0, { cachedInputTokens: 10_000, cacheWrite12hTokens: 10_000 }));
  assert.equal(cost, 0.0072);
  // Eldre modeller har ingen egen pris for skriving: den koster som vanlig input.
  assert.equal(estimateCostUsd("gpt-5.5", usage(1_000_000, 0, { cacheWrite30mTokens: 1_000_000 })), 5);
  // Tall som ikke går opp (mer i bufferen enn input), gir aldri negativ kostnad.
  assert.equal(estimateCostUsd("gpt-5.6-luna", usage(100, 0, { cachedInputTokens: 500, cacheWrite12hTokens: 500 })), 0.000002);
});

test("forbruket fra Agents SDK summeres over alle kall i kjøringen", () => {
  const tokens = tokenUsageFromSdk({
    inputTokens: 5_000,
    outputTokens: 700,
    inputTokensDetails: [
      { cached_tokens: 1_000, cache_write_tokens: 2_000, cache_write_tokens_details: { ttl_30m_tokens: 500, ttl_12h_tokens: 1_000 } },
      { cached_tokens: 200 },
      null,
      { cache_write_tokens: 300 },
    ],
  });
  // 500 skrevne tokens uten fordeling i første kall og 300 i det siste regnes med 12-timerssatsen.
  assert.deepEqual(tokens, {
    inputTokens: 5_000, outputTokens: 700, cachedInputTokens: 1_200, cacheWrite30mTokens: 500, cacheWrite12hTokens: 1_800,
  });
  assert.deepEqual(tokenUsageFromSdk({ inputTokens: 10, outputTokens: 2 }), usage(10, 2));
});
