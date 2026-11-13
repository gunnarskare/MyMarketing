import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateBrandAnalysis } from "@/lib/ai/brand-analysis";
import type { BrandAnalysis } from "@/lib/ai/brand-analysis-schema";
import { ensureOpenAIConfigured } from "@/lib/ai/openai-client";
import { crawlWebsite } from "@/lib/brand-crawler";
import { extractPageText, fetchPublicHtml } from "@/lib/brand-crawler-fetch";

export type ProfileInput = {
  website_url: string | null; tone: string | null; audience: string | null;
  products: string | null; avoid: string | null; language: string | null;
};

export type StoredAnalysis = {
  analysis: BrandAnalysis | null;
  status: "ready" | "needs_review" | "approved" | "not_created";
  analyzedAt: string | null;
  approvedAt: string | null;
  websiteUrl: string | null;
  sourcePages: { url: string; depth: number }[];
  model: string | null;
  /** Profilen er endret etter at analysen ble laget. */
  stale: boolean;
};

/** Fingeravtrykk av det analysen bygger på. Endres profilen, endres fingeravtrykket. */
export function profileHash(orgName: string, profile: ProfileInput | null): string {
  return createHash("sha256").update(JSON.stringify({
    organizationName: orgName,
    websiteUrl: profile?.website_url?.trim() || null,
    tone: profile?.tone, audience: profile?.audience, products: profile?.products,
    avoid: profile?.avoid, language: profile?.language,
  })).digest("hex");
}

/** Leser lagret analyse. Lager aldri en ny, så den er billig og rask. */
export async function loadBrandAnalysis(
  supabase: SupabaseClient, org: { id: string; name: string }, profile: ProfileInput | null,
): Promise<StoredAnalysis> {
  const { data, error } = await supabase.from("brand_analyses")
    .select("analysis,status,analyzed_at,approved_at,website_url,source_pages,model,profile_hash")
    .eq("org_id", org.id).maybeSingle();
  if (error) throw new Error("Kunne ikke lese merkevareanalysen.");
  if (!data) {
    return { analysis: null, status: "not_created", analyzedAt: null, approvedAt: null, websiteUrl: null, sourcePages: [], model: null, stale: false };
  }
  return {
    analysis: data.analysis as BrandAnalysis,
    status: data.status,
    analyzedAt: data.analyzed_at,
    approvedAt: data.approved_at,
    websiteUrl: data.website_url,
    sourcePages: Array.isArray(data.source_pages) ? data.source_pages : [],
    model: data.model,
    stale: Boolean(data.profile_hash) && data.profile_hash !== profileHash(org.name, profile),
  };
}

/**
 * Henter nettsiden, lager en ny analyse med AI og lagrer den. Erstatter den gamle, også en godkjent.
 * Kalles bare når brukeren ber om det. Kvoten sjekkes av den som kaller.
 */
export async function regenerateBrandAnalysis(
  supabase: SupabaseClient, org: { id: string; name: string }, profile: ProfileInput | null,
): Promise<StoredAnalysis> {
  const websiteUrl = profile?.website_url?.trim() || null;
  if (!websiteUrl) throw new Error("Legg inn nettsiden i profilen før analysen lages.");

  const crawl = await crawlWebsite(websiteUrl, fetchPublicHtml, { maxPages: 12, timeBudgetMs: 30_000 });
  if (!crawl.pages.length) throw new Error(crawl.failures[0]?.error || "Fant ingen sider på nettsiden.");
  const pages = crawl.pages.map((page) => ({ url: page.url, text: extractPageText(page.html) }));

  ensureOpenAIConfigured();
  const analysis = await generateBrandAnalysis({
    organizationName: org.name,
    websiteUrl,
    profile: { tone: profile?.tone, audience: profile?.audience, products: profile?.products, avoid: profile?.avoid, language: profile?.language },
    pages,
  });

  const now = new Date().toISOString();
  const status = analysis.quality.requiresHumanReview || analysis.quality.confidence === "low" ? "needs_review" : "ready";
  const row = {
    org_id: org.id,
    schema_version: 1,
    website_url: websiteUrl,
    profile_hash: profileHash(org.name, profile),
    source_hash: createHash("sha256").update(pages.map((page) => page.url + "\n" + page.text).join("\n\n")).digest("hex"),
    analysis,
    source_pages: crawl.pages.map((page) => ({ url: page.url, depth: page.depth })),
    model: process.env.OPENAI_DEFAULT_MODEL || "gpt-5.6-luna",
    status,
    approved_at: null,
    approved_by: null,
    analyzed_at: now,
    updated_at: now,
  };
  const { error } = await supabase.from("brand_analyses").upsert(row, { onConflict: "org_id" });
  if (error) throw new Error("Kunne ikke lagre merkevareanalysen.");
  return {
    analysis, status, analyzedAt: now, approvedAt: null, websiteUrl,
    sourcePages: row.source_pages, model: row.model, stale: false,
  };
}
