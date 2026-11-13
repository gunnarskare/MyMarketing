import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AssetKind = "image" | "logo" | "font";

export const BUCKET = "brand-assets";
export const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const FONT_MIME_BY_EXT: Record<string, string> = { woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", otf: "font/otf" };
const LEGACY_FONT_MIME: Record<string, string> = {
  "application/font-woff": "font/woff",
  "application/x-font-ttf": "font/ttf",
  "application/vnd.ms-opentype": "font/otf",
};

/** Gjør gamle font-MIME-typer om til de lagringsbøtta godtar. */
export function normalizeMime(mime: string): string {
  return LEGACY_FONT_MIME[mime] ?? mime;
}

export function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Trygt filnavn, med norske bokstaver, uten mappeskille og rare tegn. */
export function safeFileName(name: string, fallback = "fil"): string {
  const cleaned = name.normalize("NFC").replace(/[^\p{L}\p{N}._-]+/gu, "_").replace(/_+/g, "_").replace(/^[._]+/, "").slice(0, 80);
  return cleaned || fallback;
}

export type StoreResult = { status: "stored"; id: string } | { status: "duplicate"; existingName: string };

/**
 * Lagrer en fil i bedriftens private bibliotek. Samme fil (samme innhold) lagres bare én gang.
 * Bruker innloggingen til den som kaller, så tilgangsreglene i databasen gjelder fullt ut.
 */
export async function storeBrandAsset(
  supabase: SupabaseClient,
  input: { orgId: string; kind: AssetKind; name: string; bytes: Buffer; mime: string; isPrimary?: boolean },
): Promise<StoreResult> {
  const contentHash = sha256Hex(input.bytes);
  const { data: existing } = await supabase
    .from("brand_assets")
    .select("original_name")
    .eq("org_id", input.orgId)
    .eq("content_hash", contentHash)
    .maybeSingle();
  if (existing) return { status: "duplicate", existingName: existing.original_name };

  const mime = normalizeMime(input.mime);
  const path = `${input.orgId}/${randomUUID()}-${safeFileName(input.name)}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, input.bytes, { contentType: mime, upsert: false });
  if (uploadError) throw new Error("Lagringen avviste filen: " + uploadError.message);

  const { data, error } = await supabase
    .from("brand_assets")
    .insert({
      org_id: input.orgId,
      kind: input.kind,
      original_name: input.name.slice(0, 180),
      storage_path: path,
      mime_type: mime,
      file_size: input.bytes.length,
      is_primary: false,
      content_hash: contentHash,
    })
    .select("id")
    .single();
  if (error || !data) {
    await supabase.storage.from(BUCKET).remove([path]);
    if (error?.code === "23505") return { status: "duplicate", existingName: input.name };
    throw new Error("Filen kunne ikke registreres i biblioteket.");
  }
  if (input.isPrimary) await setPrimary(supabase, input.orgId, data.id, input.kind);
  return { status: "stored", id: data.id };
}

/** Gjør én fil til hovedfil for sin type (for eksempel hovedlogo). */
export async function setPrimary(supabase: SupabaseClient, orgId: string, assetId: string, kind: AssetKind): Promise<boolean> {
  const { error: clearError } = await supabase.from("brand_assets").update({ is_primary: false }).eq("org_id", orgId).eq("kind", kind).eq("is_primary", true);
  if (clearError) return false;
  const { error } = await supabase.from("brand_assets").update({ is_primary: true }).eq("org_id", orgId).eq("id", assetId).eq("kind", kind);
  return !error;
}
