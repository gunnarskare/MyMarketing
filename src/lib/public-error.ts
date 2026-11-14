/**
 * En feil med en melding som trygt kan vises til brukeren.
 * Alle andre feil (fra AI-tjenesten, databasen eller koden) vises som en nøytral melding og logges på serveren.
 */
export class PublicError extends Error {}

export function publicMessage(error: unknown, fallback: string): string {
  return error instanceof PublicError ? error.message : fallback;
}

/** Sann når et kall ble avbrutt fordi tidsgrensen gikk ut (AbortSignal.timeout). */
export function isTimeout(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return ["TimeoutError", "AbortError", "APIUserAbortError", "APIConnectionTimeoutError"].includes(error.name)
    || /\b(aborted|timed out|timeout)\b/i.test(error.message);
}
