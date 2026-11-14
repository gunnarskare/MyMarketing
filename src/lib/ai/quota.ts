import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type QuotaType = "brand_analysis" | "assistant" | "website_import" | "weekly_plan" | "post_rewrite";
/** runId er raden i ai_runs som kvoten opprettet. Send den til runAndRecordUsage (usage.ts). */
export type QuotaResult = { allowed: true; remaining: number; runId: string | null } | { allowed: false; message: string };

const LABELS: Record<QuotaType, string> = {
  brand_analysis: "merkevareanalyser",
  assistant: "spørsmål til assistenten",
  website_import: "nettsideanalyser",
  weekly_plan: "ukeplaner",
  post_rewrite: "omskrivinger",
};

function inTime(seconds: number): string {
  if (seconds >= 5400) return `om ${Math.round(seconds / 3600)} timer`;
  if (seconds >= 3600) return "om en time";
  return `om ${Math.max(1, Math.round(seconds / 60))} minutter`;
}

/**
 * Registrerer et kall mot dagens kvote (per bedrift og totalt). Sier nei hvis kvoten er brukt opp.
 * Telleren ligger i databasen (public.claim_ai_quota), så den kan ikke omgås fra nettleseren.
 * Feiler kontrollen, stoppes kallet: heller ingen AI enn en ubegrenset regning.
 * Raden som opprettes, får modell, tokens og kostnad når AI-kallet er ferdig (se usage.ts).
 */
export async function claimQuota(supabase: SupabaseClient, orgId: string, type: QuotaType): Promise<QuotaResult> {
  const { data, error } = await supabase.rpc("claim_ai_quota", { p_org: orgId, p_type: type });
  if (error || !data) {
    console.error("Quota check failed:", error?.message ?? "no data");
    return { allowed: false, message: "Kunne ikke sjekke bruksgrensen akkurat nå. Prøv igjen om litt." };
  }
  const result = data as { allowed: boolean; reason: "org" | "global" | null; remaining: number; retry_after_seconds: number; run_id?: string | null };
  if (result.allowed) return { allowed: true, remaining: result.remaining, runId: result.run_id ?? null };
  if (result.reason === "global") {
    return { allowed: false, message: `Spott har nådd dagens grense for ${LABELS[type]}. Prøv igjen ${inTime(result.retry_after_seconds)}.` };
  }
  return { allowed: false, message: `Dere har brukt opp dagens ${LABELS[type]}. Prøv igjen ${inTime(result.retry_after_seconds)}.` };
}
