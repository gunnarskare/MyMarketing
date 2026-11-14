import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrandContext } from "@/lib/ai/weekly-plan";

export class MissingBrandError extends Error {}

/** Alt AI-en trenger for å skrive innlegg for bedriften. Krever at merkevareanalysen finnes. */
export async function loadBrandContext(supabase: SupabaseClient, org: { id: string; name: string }): Promise<BrandContext> {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [profileResult, analysisResult, assetsResult, recentResult] = await Promise.all([
    supabase.from("brand_profiles").select("website_url,tone,audience,products,avoid,language").eq("org_id", org.id).maybeSingle(),
    supabase.from("brand_analyses").select("analysis").eq("org_id", org.id).maybeSingle(),
    supabase.from("brand_assets").select("id,original_name,kind").eq("org_id", org.id).in("kind", ["image", "logo"]).order("created_at", { ascending: false }).limit(40),
    supabase.from("posts").select("topic").eq("org_id", org.id).gte("created_at", since).not("topic", "is", null).limit(40),
  ]);
  if (!analysisResult.data?.analysis) throw new MissingBrandError("Lag merkevareanalysen først. Den er grunnlaget innleggene skrives ut fra.");
  const profile = profileResult.data;
  return {
    organizationName: org.name,
    language: profile?.language ?? "nb",
    profile: {
      website_url: profile?.website_url ?? null, tone: profile?.tone ?? null, audience: profile?.audience ?? null,
      products: profile?.products ?? null, avoid: profile?.avoid ?? null,
    },
    analysis: analysisResult.data.analysis,
    assets: (assetsResult.data ?? []).map((a) => ({ id: a.id, name: a.original_name, kind: a.kind })),
    recentTopics: [...new Set((recentResult.data ?? []).map((p) => p.topic as string))],
  };
}
