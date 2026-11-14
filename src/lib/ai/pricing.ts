// Hva OpenAI tar betalt per modell, og anslått kostnad for ett AI-kall. Prisene står bare her.
//
// Kilde: OpenAIs prisside, https://developers.openai.com/api/docs/pricing (lest 14. november 2026).
// - Standard-nivå. Spott bruker ikke Batch, Flex eller Fast.
// - Kort kontekst (inntil 272K input-tokens per kall). Lang kontekst koster mer, men Spott kapper
//   alt som sendes til AI-en langt under den grensen (se brand-analysis.ts og weekly-plan.ts).
// - USD per 1M tokens. Resonnerings-tokens er med i output-tokens og koster som output.
// - gpt-5.6-sol har kampanjepris til 30. november 2026.
// Oppdater tabellen når OpenAI endrer prisene eller Spott tar i bruk en ny modell.

export type ModelPrice = {
  input: number;
  cachedInput: number;
  output: number;
  /** Input som skrives til hurtigbufferen. Mangler for eldre modeller, der det koster som vanlig input. */
  cacheWrite30m?: number;
  cacheWrite12h?: number;
};

const MODEL_PRICES = new Map<string, ModelPrice>([
  ["gpt-6-astra", { input: 10, cachedInput: 1, output: 50, cacheWrite30m: 12.5, cacheWrite12h: 25 }],
  ["gpt-6.1-sol", { input: 2, cachedInput: 0.1, output: 10, cacheWrite30m: 2.5, cacheWrite12h: 5 }],
  ["gpt-6.1-terra", { input: 1, cachedInput: 0.05, output: 5, cacheWrite30m: 1.25, cacheWrite12h: 2.5 }],
  ["gpt-6-luna", { input: 0.1, cachedInput: 0.01, output: 0.5, cacheWrite30m: 0.125, cacheWrite12h: 0.25 }],
  ["gpt-6-sol", { input: 2, cachedInput: 0.2, output: 10, cacheWrite30m: 2.5, cacheWrite12h: 5 }],
  ["gpt-5.6-sol", { input: 4, cachedInput: 0.4, output: 20, cacheWrite30m: 5, cacheWrite12h: 10 }],
  ["gpt-5.6-terra", { input: 2, cachedInput: 0.2, output: 12, cacheWrite30m: 2.5, cacheWrite12h: 5 }],
  ["gpt-5.6-luna", { input: 0.2, cachedInput: 0.02, output: 1.2, cacheWrite30m: 0.25, cacheWrite12h: 0.5 }],
  ["gpt-5.5", { input: 5, cachedInput: 0.5, output: 30 }],
  ["gpt-5.4", { input: 2.5, cachedInput: 0.25, output: 15 }],
  ["gpt-5.4-mini", { input: 0.75, cachedInput: 0.075, output: 4.5 }],
  ["gpt-5.4-nano", { input: 0.2, cachedInput: 0.02, output: 1.25 }],
]);

/** Tokens for én kjøring. Hurtigbuffer-tallene er deler av inputTokens, ikke i tillegg. */
export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  cacheWrite30mTokens: number;
  cacheWrite12hTokens: number;
};

/** Prisen for en modell. Datoversjoner (gpt-5.6-luna-2026-07-30) har samme pris som modellen. */
export function priceFor(model: string): ModelPrice | null {
  const name = model.trim().toLowerCase();
  return MODEL_PRICES.get(name) ?? MODEL_PRICES.get(name.replace(/-\d{4}-\d{2}-\d{2}$/, "")) ?? null;
}

const count = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0);

/**
 * Gjør forbruket fra OpenAI Agents SDK (result.state.usage) om til TokenUsage.
 * inputTokensDetails har én oppføring per kall mot OpenAI, med feltene fra Responses API.
 */
export function tokenUsageFromSdk(usage: { inputTokens: number; outputTokens: number; inputTokensDetails?: readonly unknown[] }): TokenUsage {
  let cached = 0;
  let write30m = 0;
  let write12h = 0;
  for (const entry of usage.inputTokensDetails ?? []) {
    if (!entry || typeof entry !== "object") continue;
    const details = entry as Record<string, unknown>;
    const split = (details.cache_write_tokens_details ?? {}) as Record<string, unknown>;
    const thirtyMinutes = count(split.ttl_30m_tokens);
    const twelveHours = count(split.ttl_12h_tokens);
    cached += count(details.cached_tokens);
    write30m += thirtyMinutes;
    // Skriving uten fordeling regnes med den dyreste satsen, så anslaget heller blir for høyt enn for lavt.
    write12h += twelveHours + Math.max(0, count(details.cache_write_tokens) - thirtyMinutes - twelveHours);
  }
  return {
    inputTokens: count(usage.inputTokens),
    outputTokens: count(usage.outputTokens),
    cachedInputTokens: cached,
    cacheWrite30mTokens: write30m,
    cacheWrite12hTokens: write12h,
  };
}

/** Anslått kostnad i USD, avrundet til seks desimaler. null hvis modellen ikke står i tabellen. */
export function estimateCostUsd(model: string, usage: TokenUsage): number | null {
  const price = priceFor(model);
  if (!price) return null;
  const input = count(usage.inputTokens);
  const cached = Math.min(count(usage.cachedInputTokens), input);
  const write12h = Math.min(count(usage.cacheWrite12hTokens), input - cached);
  const write30m = Math.min(count(usage.cacheWrite30mTokens), input - cached - write12h);
  const plain = input - cached - write12h - write30m;
  const perMillion = plain * price.input
    + cached * price.cachedInput
    + write30m * (price.cacheWrite30m ?? price.input)
    + write12h * (price.cacheWrite12h ?? price.input)
    + count(usage.outputTokens) * price.output;
  return Math.round(perMillion) / 1_000_000;
}
