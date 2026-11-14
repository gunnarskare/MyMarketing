import { NextResponse } from "next/server";
import { loadBrandAnalysis, profileHash, regenerateBrandAnalysis, type ProfileInput } from "@/lib/ai/brand-analysis-cache";
import { describePath } from "@/lib/ai/brand-analysis-labels";
import { brandAnalysisSchema } from "@/lib/ai/brand-analysis-schema";
import { claimQuota } from "@/lib/ai/quota";
import { requireOrg } from "@/lib/auth";
import { getBillingAccount, hasAccess, PAYWALL_MESSAGE } from "@/lib/billing";
import { isTimeout, publicMessage } from "@/lib/public-error";

// Henting av nettsiden (opptil 30 s) og AI-analysen (opptil 150 s).
export const maxDuration = 240;

async function context() {
  try {
    return await requireOrg();
  } catch {
    return null;
  }
}

async function readProfile(ctx: NonNullable<Awaited<ReturnType<typeof context>>>): Promise<ProfileInput | null> {
  const { data, error } = await ctx.supabase.from("brand_profiles")
    .select("website_url,tone,audience,products,avoid,language").eq("org_id", ctx.org.id).maybeSingle();
  if (error) throw new Error("Kunne ikke lese merkevareprofilen.");
  return data;
}

export async function GET() {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ error: "Du må være logget inn." }, { status: 401 });
  try {
    return NextResponse.json(await loadBrandAnalysis(ctx.supabase, ctx.org, await readProfile(ctx)));
  } catch (error) {
    console.error("Brand analysis read failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Kunne ikke hente analysen." }, { status: 500 });
  }
}

/** Lager en ny analyse fra nettsiden. Bare når brukeren ber om det, og innenfor dagens kvote. */
export async function POST() {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ error: "Du må være logget inn." }, { status: 401 });
  try {
    const profile = await readProfile(ctx);
    if (!profile?.website_url) return NextResponse.json({ error: "Legg inn nettsiden i profilen før analysen lages." }, { status: 400 });
    if (!hasAccess(await getBillingAccount(ctx.supabase, ctx.org.id))) return NextResponse.json({ error: PAYWALL_MESSAGE }, { status: 402 });
    const quota = await claimQuota(ctx.supabase, ctx.org.id, "brand_analysis");
    if (!quota.allowed) return NextResponse.json({ error: quota.message }, { status: 429 });
    const result = await regenerateBrandAnalysis(ctx.supabase, ctx.org, profile);
    return NextResponse.json({ ...result, remaining: quota.remaining });
  } catch (error) {
    console.error("Brand analysis refresh failed:", error instanceof Error ? error.message : "Unknown error");
    const message = error instanceof Error ? error.message : "";
    if (message.includes("OPENAI_API_KEY")) return NextResponse.json({ error: "AI-tjenesten er ikke satt opp på serveren." }, { status: 503 });
    if (isTimeout(error)) return NextResponse.json({ error: "Analysen tok for lang tid. Prøv igjen." }, { status: 504 });
    return NextResponse.json({ error: publicMessage(error, "Spott klarte ikke å lage analysen. Prøv igjen.") }, { status: 502 });
  }
}

/** Lagrer endringer fra redigeringen, og eventuelt godkjenning. */
export async function PATCH(request: Request) {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ error: "Du må være logget inn." }, { status: 401 });
  let body: { analysis?: unknown; approved?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørsel." }, { status: 400 });
  }
  if (typeof body.approved !== "boolean") return NextResponse.json({ error: "Velg om analysen skal godkjennes." }, { status: 400 });
  const parsed = brandAnalysisSchema.safeParse(body.analysis);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ error: `Sjekk feltet ${describePath(issue?.path ?? [])}. Verdien er ikke gyldig.` }, { status: 400 });
  }
  const now = new Date().toISOString();
  // Godkjenner du analysen, har du sett på den opp mot profilen slik den er nå.
  // Da er den ikke lenger utdatert, selv om profilen er endret etter at den ble laget.
  const approvedFor = body.approved ? profileHash(ctx.org.name, await readProfile(ctx).catch(() => null)) : undefined;
  const { data, error } = await ctx.supabase.from("brand_analyses").update({
    analysis: parsed.data,
    status: body.approved ? "approved" : "needs_review",
    approved_at: body.approved ? now : null,
    approved_by: body.approved ? ctx.userId : null,
    updated_at: now,
    ...(approvedFor ? { profile_hash: approvedFor } : {}),
  }).eq("org_id", ctx.org.id).select("id");
  if (error || !data?.length) {
    if (error) console.error("Brand analysis save failed:", error.message);
    return NextResponse.json({ error: "Kunne ikke lagre analysen." }, { status: 500 });
  }
  return NextResponse.json({ status: body.approved ? "approved" : "needs_review", approvedAt: body.approved ? now : null, stale: body.approved ? false : undefined });
}
