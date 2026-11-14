import { NextResponse } from "next/server";
import { ensureOpenAIConfigured } from "@/lib/ai/openai-client";
import { claimQuota } from "@/lib/ai/quota";
import { generateWeeklyDrafts } from "@/lib/ai/weekly-plan";
import { requireOrg } from "@/lib/auth";
import { getBillingAccount, hasAccess, PAYWALL_MESSAGE } from "@/lib/billing";
import { isTimeout } from "@/lib/public-error";
import { loadBrandContext, MissingBrandError } from "@/lib/weekly-plan-context";
import { cleanDrafts, isoWeek, osloToUtc, planningWeek, PLATFORMS, type Platform, type WeekChoice } from "@/lib/week";

// AI-en får opptil to minutter på å skrive uka.
export const maxDuration = 180;

/** Lager ukas utkast. Erstatter utkast som ikke er godkjent; godkjente og publiserte innlegg blir stående. */
export async function POST(request: Request) {
  let ctx: Awaited<ReturnType<typeof requireOrg>>;
  try {
    ctx = await requireOrg();
  } catch {
    return NextResponse.json({ error: "Du må være logget inn." }, { status: 401 });
  }
  const { supabase, org } = ctx;

  let body: { week?: unknown; count?: unknown; platforms?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørsel." }, { status: 400 });
  }
  const choice: WeekChoice = body.week === "this" ? "this" : "next";
  const platforms = Array.isArray(body.platforms) ? PLATFORMS.filter((p) => (body.platforms as unknown[]).includes(p)) : [...PLATFORMS];
  const wanted = typeof body.count === "number" ? Math.round(body.count) : 3;
  if (!platforms.length) return NextResponse.json({ error: "Velg minst én kanal." }, { status: 400 });
  if (wanted < 1 || wanted > 10) return NextResponse.json({ error: "Velg mellom 1 og 10 innlegg." }, { status: 400 });

  const week = planningWeek(choice);
  if (!week.days.length) return NextResponse.json({ error: "Det er ingen dager igjen denne uka. Velg neste uke." }, { status: 400 });
  const count = Math.min(wanted, week.days.length * platforms.length);

  if (!hasAccess(await getBillingAccount(supabase, org.id))) return NextResponse.json({ error: PAYWALL_MESSAGE }, { status: 402 });

  let brand;
  try {
    brand = await loadBrandContext(supabase, org);
  } catch (error) {
    if (error instanceof MissingBrandError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }

  const quota = await claimQuota(supabase, org.id, "weekly_plan");
  if (!quota.allowed) return NextResponse.json({ error: quota.message }, { status: 429 });

  try {
    ensureOpenAIConfigured();
    const drafts = await generateWeeklyDrafts(brand, { days: week.days, platforms: platforms as Platform[], count, weekNumber: isoWeek(week.start) });
    const posts = cleanDrafts(drafts, { days: week.days, platforms: platforms as Platform[], assetIds: brand.assets.map((a) => a.id), max: count });
    if (!posts.length) return NextResponse.json({ error: "AI-en laget ingen brukbare innlegg. Prøv igjen." }, { status: 502 });

    const { data: plan, error: planError } = await supabase.from("content_plans")
      .upsert({ org_id: org.id, period_start: week.start, period_end: week.end, status: "draft" }, { onConflict: "org_id,period_start" })
      .select("id").single();
    if (planError || !plan) throw new Error("Kunne ikke lagre planen.");

    // De nye innleggene lagres før de gamle utkastene fjernes. Feiler lagringen, står de gamle igjen.
    const { data: oldDrafts, error: oldError } = await supabase.from("posts").select("id").eq("org_id", org.id).eq("plan_id", plan.id).eq("status", "draft");
    if (oldError) throw new Error("Kunne ikke lese de gamle utkastene.");

    const { error: insertError } = await supabase.from("posts").insert(posts.map((post) => ({
      org_id: org.id,
      plan_id: plan.id,
      platform: post.platform,
      topic: post.topic,
      pillar: post.pillar,
      base_text: post.text,
      hashtags: post.hashtags,
      image_idea: post.imageIdea,
      asset_id: post.assetId,
      scheduled_at: osloToUtc(post.date, post.time).toISOString(),
      status: "draft",
      created_by: "ai",
    })));
    if (insertError) throw new Error("Kunne ikke lagre innleggene.");

    const oldIds = (oldDrafts ?? []).map((row) => row.id);
    if (oldIds.length) {
      const { error: deleteError } = await supabase.from("posts").delete().eq("org_id", org.id).eq("status", "draft").in("id", oldIds);
      // Ikke kritisk: de nye er lagret. Brukeren kan slette de gamle selv.
      if (deleteError) console.error("Weekly plan: old drafts not removed:", deleteError.message);
    }

    return NextResponse.json({ week: week.start, count: posts.length, remaining: quota.remaining });
  } catch (error) {
    console.error("Weekly plan failed:", error instanceof Error ? error.message : error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("OPENAI_API_KEY")) return NextResponse.json({ error: "AI-tjenesten er ikke satt opp på serveren." }, { status: 503 });
    if (isTimeout(error)) return NextResponse.json({ error: "Det tok for lang tid å skrive innleggene. Prøv igjen, gjerne med færre innlegg." }, { status: 504 });
    return NextResponse.json({ error: message.startsWith("Kunne ikke") ? message : "Spott klarte ikke å lage utkastene. Prøv igjen." }, { status: 502 });
  }
}
