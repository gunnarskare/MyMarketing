import { NextRequest, NextResponse } from "next/server";
import { run } from "@openai/agents";
import { createSpottAssistant } from "@/lib/ai/agents/spott-assistant";
import { loadBrandAnalysis } from "@/lib/ai/brand-analysis-cache";
import { ensureOpenAIConfigured } from "@/lib/ai/openai-client";
import { claimQuota } from "@/lib/ai/quota";
import { requireOrg } from "@/lib/auth";

export const maxDuration = 60;
const MAX_MESSAGE_LENGTH = 4000;

export async function POST(request: NextRequest) {
  let context: Awaited<ReturnType<typeof requireOrg>>;
  try {
    context = await requireOrg();
  } catch {
    return NextResponse.json({ error: "Du må være logget inn og ha en bedrift." }, { status: 401 });
  }
  let body: { message?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørsel." }, { status: 400 });
  }
  if (typeof body.message !== "string" || !body.message.trim()) return NextResponse.json({ error: "Skriv en melding til Spott." }, { status: 400 });
  if (body.message.length > MAX_MESSAGE_LENGTH) return NextResponse.json({ error: "Meldingen er for lang." }, { status: 413 });

  const { supabase, org } = context;
  const quota = await claimQuota(supabase, org.id, "assistant");
  if (!quota.allowed) return NextResponse.json({ error: quota.message }, { status: 429 });

  try {
    const { data: profile } = await supabase.from("brand_profiles")
      .select("website_url,tone,audience,products,avoid,language").eq("org_id", org.id).maybeSingle();
    // Assistenten bruker analysen som finnes. Den lager aldri en ny selv: det koster og tar tid,
    // og ville overskrevet endringer brukeren har gjort.
    const brand = await loadBrandAnalysis(supabase, org, profile);
    ensureOpenAIConfigured();
    const agent = createSpottAssistant({
      organizationName: org.name, websiteUrl: profile?.website_url, tone: profile?.tone, audience: profile?.audience,
      products: profile?.products, avoid: profile?.avoid, language: profile?.language, brandAnalysis: brand.analysis,
    });
    const result = await run(agent, body.message.trim());
    if (typeof result.finalOutput !== "string" || !result.finalOutput.trim()) {
      return NextResponse.json({ error: "Spott klarte ikke å lage et svar. Prøv igjen." }, { status: 502 });
    }
    return NextResponse.json({
      answer: result.finalOutput,
      organization: org.name,
      brandAnalysis: { status: brand.status, stale: brand.stale, analyzedAt: brand.analyzedAt },
      remaining: quota.remaining,
    });
  } catch (error) {
    console.error("Spott assistant request failed:", error instanceof Error ? error.message : "Unknown error");
    const message = error instanceof Error ? error.message : "";
    if (message.includes("OPENAI_API_KEY")) return NextResponse.json({ error: "AI-tjenesten er ikke satt opp på serveren." }, { status: 503 });
    return NextResponse.json({ error: "Spott fikk ikke kontakt med AI-tjenesten. Prøv igjen." }, { status: 502 });
  }
}
