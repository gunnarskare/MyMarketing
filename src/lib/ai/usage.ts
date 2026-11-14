import "server-only";
import { after } from "next/server";
import { AgentsError, run, type ModelResponse, type Usage } from "@openai/agents";
import { estimateCostUsd, tokenUsageFromSdk } from "@/lib/ai/pricing";
import { createAdminClient } from "@/lib/supabase/admin";

// Hvilken som helst agent (samme krav som run() stiller).
type AnyAgent = Parameters<typeof run>[0];
type RunUsage = { model: string; usage: Usage };

/**
 * Kjører agenten og fører modell, tokens og anslått kostnad på raden kvoten opprettet i ai_runs
 * (aiRunId fra claimQuota). Feiler kjøringen etter at OpenAI har svart, føres forbruket likevel,
 * for da har kallet kostet penger. Føringen kan aldri gjøre at brukerens forespørsel feiler.
 */
export async function runAndRecordUsage<TAgent extends AnyAgent>(
  aiRunId: string | null,
  agent: TAgent,
  input: string,
  options: { signal?: AbortSignal } = {},
) {
  const configuredModel = typeof agent.model === "string" && agent.model ? agent.model : "unknown";
  const result = await run(agent, input, options).catch((error: unknown) => {
    // Feil fra Agents SDK kan ha med seg kjøringen så langt, og dermed forbruket.
    recordUsage(aiRunId, () => {
      const usage = error instanceof AgentsError ? error.state?.usage : undefined;
      return usage && usage.requests > 0 ? { model: configuredModel, usage } : null;
    });
    throw error;
  });
  recordUsage(aiRunId, () => ({ model: servedModel(result.rawResponses) ?? configuredModel, usage: result.state.usage }));
  return result;
}

/** Modellen OpenAI faktisk svarte med, for eksempel en datoversjon av den vi ba om. */
function servedModel(responses: readonly ModelResponse[]): string | null {
  const model = responses.at(-1)?.providerData?.model;
  return typeof model === "string" && model.trim() ? model.trim() : null;
}

/**
 * Skriver forbruket etter at svaret er sendt til brukeren (after), med service-nøkkelen.
 * Alt, også å lese forbruket fra kjøringen, skjer inne i try, og feil logges på serveren og svelges.
 */
function recordUsage(aiRunId: string | null, read: () => RunUsage | null): void {
  const write = async () => {
    try {
      const entry = read();
      if (!entry) return;
      if (!aiRunId) throw new Error("claim_ai_quota returned no run_id");
      const tokens = tokenUsageFromSdk(entry.usage);
      const model = entry.model.slice(0, 100);
      const cost = estimateCostUsd(model, tokens);
      if (cost === null) console.error(`AI usage: no price for model "${model}". Add it to src/lib/ai/pricing.ts.`);
      const { data, error } = await createAdminClient().rpc("record_ai_usage", {
        p_run: aiRunId,
        p_model: model,
        p_tokens: tokens.inputTokens + tokens.outputTokens,
        p_cost: cost,
      });
      if (error) throw new Error(error.message);
      if (data !== true) throw new Error(`ai_runs row ${aiRunId} was not found or already recorded`);
    } catch (error) {
      console.error("AI usage logging failed:", error instanceof Error ? error.message : error);
    }
  };
  try {
    after(write);
  } catch {
    // Utenfor en forespørsel (after er ikke tilgjengelig): skriv med en gang, uten å vente.
    void write();
  }
}
