"use server";

import { ensureOpenAIConfigured } from "@/lib/ai/openai-client";
import { claimQuota } from "@/lib/ai/quota";
import { rewriteDraft } from "@/lib/ai/weekly-plan";
import { requireOrg } from "@/lib/auth";
import { getBillingAccount, hasAccess, PAYWALL_MESSAGE } from "@/lib/billing";
import { loadBrandContext, MissingBrandError } from "@/lib/weekly-plan-context";
import { DAYS, normalizeHashtags, normalizeTime, osloParts, osloToUtc, type Platform } from "@/lib/week";

export type PostRow = {
  id: string; platform: Platform; topic: string | null; pillar: string | null; base_text: string; hashtags: string[];
  image_idea: string | null; asset_id: string | null; status: "draft" | "approved" | "published"; scheduled_at: string | null; published_at: string | null;
};
export type ActionResult = { ok: true; post?: PostRow } | { ok: false; message: string };

const COLUMNS = "id,platform,topic,pillar,base_text,hashtags,image_idea,asset_id,status,scheduled_at,published_at";
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function savePost(id: string, input: { text: string; hashtags: string; date: string; time: string }): Promise<ActionResult> {
  const { supabase, org } = await requireOrg();
  const text = input.text.trim();
  if (!text) return { ok: false, message: "Innlegget kan ikke være tomt." };
  if (text.length > 3000) return { ok: false, message: "Innlegget kan ha opptil 3000 tegn." };
  if (!DATE.test(input.date)) return { ok: false, message: "Velg en gyldig dato." };
  const { data: current } = await supabase.from("posts").select("platform").eq("org_id", org.id).eq("id", id).maybeSingle();
  if (!current) return { ok: false, message: "Fant ikke innlegget." };
  const hashtags = normalizeHashtags(input.hashtags.split(/[\s,]+/), current.platform === "instagram" ? 15 : 5);
  const { data, error } = await supabase.from("posts").update({
    base_text: text,
    hashtags,
    scheduled_at: osloToUtc(input.date, normalizeTime(input.time)).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("org_id", org.id).eq("id", id).select(COLUMNS).single();
  if (error || !data) return { ok: false, message: "Kunne ikke lagre innlegget." };
  return { ok: true, post: data as PostRow };
}

export async function setPostStatus(id: string, status: "draft" | "approved" | "published"): Promise<ActionResult> {
  const { supabase, org } = await requireOrg();
  if (!["draft", "approved", "published"].includes(status)) return { ok: false, message: "Ugyldig status." };
  const { data, error } = await supabase.from("posts").update({
    status,
    published_at: status === "published" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("org_id", org.id).eq("id", id).select(COLUMNS).single();
  if (error || !data) return { ok: false, message: "Kunne ikke oppdatere innlegget." };
  return { ok: true, post: data as PostRow };
}

export async function deletePost(id: string): Promise<ActionResult> {
  const { supabase, org } = await requireOrg();
  const { error } = await supabase.from("posts").delete().eq("org_id", org.id).eq("id", id);
  return error ? { ok: false, message: "Kunne ikke slette innlegget." } : { ok: true };
}

/** Skriver om ett innlegg med AI. Dag, klokkeslett og kanal beholdes. */
export async function rewritePost(id: string, instruction: string): Promise<ActionResult> {
  const { supabase, org } = await requireOrg();
  if (instruction.length > 300) return { ok: false, message: "Ønsket kan ha opptil 300 tegn." };
  if (!hasAccess(await getBillingAccount(supabase, org.id))) return { ok: false, message: PAYWALL_MESSAGE };
  const { data: post } = await supabase.from("posts").select(COLUMNS).eq("org_id", org.id).eq("id", id).maybeSingle<PostRow>();
  if (!post) return { ok: false, message: "Fant ikke innlegget." };

  let brand;
  try {
    brand = await loadBrandContext(supabase, org);
  } catch (error) {
    return { ok: false, message: error instanceof MissingBrandError ? error.message : "Kunne ikke hente merkevaregrunnlaget." };
  }
  const quota = await claimQuota(supabase, org.id, "post_rewrite");
  if (!quota.allowed) return { ok: false, message: quota.message };

  try {
    ensureOpenAIConfigured();
    const when = post.scheduled_at ? osloParts(new Date(post.scheduled_at)) : null;
    const draft = await rewriteDraft(brand, {
      day: when ? DAYS[when.weekday] : "monday",
      time: when?.time ?? "09:00",
      platform: post.platform,
      topic: post.topic ?? "",
      text: post.base_text,
    }, instruction.trim());
    const text = draft.text.trim().slice(0, 3000);
    if (!text) return { ok: false, message: "AI-en laget ikke noe brukbart. Prøv igjen." };
    const { data, error } = await supabase.from("posts").update({
      base_text: text,
      topic: draft.topic.trim().slice(0, 140) || post.topic,
      hashtags: normalizeHashtags(draft.hashtags, post.platform === "instagram" ? 8 : 3),
      image_idea: draft.imageIdea.trim().slice(0, 500) || post.image_idea,
      asset_id: draft.imageAssetId && brand.assets.some((a) => a.id === draft.imageAssetId) ? draft.imageAssetId : post.asset_id,
      status: "draft",
      updated_at: new Date().toISOString(),
    }).eq("org_id", org.id).eq("id", id).select(COLUMNS).single();
    if (error || !data) return { ok: false, message: "Kunne ikke lagre det nye innlegget." };
    return { ok: true, post: data as PostRow };
  } catch (error) {
    console.error("Rewrite failed:", error instanceof Error ? error.message : error);
    return { ok: false, message: "Spott klarte ikke å skrive om innlegget. Prøv igjen." };
  }
}
