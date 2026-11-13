import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { brandAnalysisSchema } from "@/lib/ai/brand-analysis-schema";

export async function GET() {
  let context: Awaited<ReturnType<typeof requireOrg>>;
  try { context = await requireOrg(); } catch { return NextResponse.json({ error: "Du må være logget inn." }, { status: 401 }); }
  const { data, error } = await context.supabase.from("brand_analyses")
    .select("analysis,status,analyzed_at,website_url,source_pages,model,approved_at")
    .eq("org_id", context.org.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Kunne ikke hente merkevareanalysen." }, { status: 500 });
  return NextResponse.json({ analysis: data?.analysis ?? null, status: data?.status ?? "not_created", analyzedAt: data?.analyzed_at ?? null, websiteUrl: data?.website_url ?? null, sourcePages: data?.source_pages ?? [], model: data?.model ?? null, approvedAt: data?.approved_at ?? null });
}

export async function POST() {
  let context: Awaited<ReturnType<typeof requireOrg>>;
  try { context = await requireOrg(); } catch { return NextResponse.json({ error: "Du må være logget inn." }, { status: 401 }); }
  try {
    const { supabase, org } = context;
    const { data: profile, error } = await supabase.from("brand_profiles").select("website_url,tone,audience,products,avoid,language").eq("org_id", org.id).maybeSingle();
    if (error) throw new Error("Kunne ikke lese merkevareprofilen.");
    const { getOrCreateBrandAnalysis } = await import("@/lib/ai/brand-analysis-cache");
    const result = await getOrCreateBrandAnalysis(supabase, org, profile, true);
    if (!result.analysis) return NextResponse.json({ error: "Legg inn en nettside i merkevareprofilen før analysen kjøres." }, { status: 400 });
    return NextResponse.json({ analysis: result.analysis, status: result.status, analyzedAt: result.analyzedAt });
  } catch (error) {
    console.error("Brand analysis refresh failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: error instanceof Error ? error.message : "Kunne ikke oppdatere analysen." }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  let context: Awaited<ReturnType<typeof requireOrg>>;
  try { context = await requireOrg(); } catch { return NextResponse.json({ error: "Du må være logget inn." }, { status: 401 }); }
  let body: { analysis?: unknown; approved?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Ugyldig JSON." }, { status: 400 }); }
  const parsed = brandAnalysisSchema.safeParse(body.analysis);
  if (!parsed.success) return NextResponse.json({ error: "Analysen har ugyldige eller manglende felt. Kontroller endringene." }, { status: 400 });
  if (typeof body.approved !== "boolean") return NextResponse.json({ error: "Velg om analysen skal godkjennes." }, { status: 400 });
  const now = new Date().toISOString();
  const { error } = await context.supabase.from("brand_analyses").update({
    analysis: parsed.data, status: body.approved ? "approved" : "needs_review",
    approved_at: body.approved ? now : null, approved_by: body.approved ? context.userId : null, updated_at: now
  }).eq("org_id", context.org.id);
  if (error) {
    console.error("Brand analysis save failed:", error.message);
    return NextResponse.json({ error: "Kunne ikke lagre merkevareanalysen." }, { status: 500 });
  }
  return NextResponse.json({ status: body.approved ? "approved" : "needs_review", approvedAt: body.approved ? now : null });
}
