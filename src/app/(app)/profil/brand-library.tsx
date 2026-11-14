"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Notice } from "@/components/notice";
import { createClient } from "@/lib/supabase/client";

type Kind = "image" | "logo" | "font";
type Asset = { id: string; kind: Kind; original_name: string; storage_path: string; mime_type: string; file_size: number; is_primary: boolean };

/** Sendes når filer importeres fra nettsiden, så biblioteket henter listen på nytt. */
export const ASSETS_CHANGED = "spott:brand-assets-changed";
/** Sendes når fonter legges til eller slettes, så typografien ser endringen. */
export const FONTS_CHANGED = "spott:fonts-changed";
const BUCKET = "brand-assets";
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const FONT_MIME: Record<string, string> = { woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", otf: "font/otf" };
const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_FONT = 5 * 1024 * 1024;

const sizeLabel = (n: number) => (n < 1048576 ? Math.max(1, Math.round(n / 1024)) + " kB" : (n / 1048576).toFixed(1).replace(".", ",") + " MB");

async function sha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

type Message = { tone: "success" | "error" | "info"; text: string };

export function BrandLibrary({ orgId }: { orgId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("brand_assets")
      .select("id,kind,original_name,storage_path,mime_type,file_size,is_primary")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (error) {
      setMessages([{ tone: "error", text: "Kunne ikke hente biblioteket. Last siden på nytt." }]);
      setAssets([]);
      return;
    }
    const rows = (data ?? []) as Asset[];
    const visual = rows.filter((asset) => asset.kind !== "font");
    const signed = visual.length
      ? await supabase.storage.from(BUCKET).createSignedUrls(visual.map((asset) => asset.storage_path), 3600)
      : { data: [] };
    const byPath = new Map((signed.data ?? []).map((entry) => [entry.path, entry.signedUrl]));
    setUrls(Object.fromEntries(visual.map((asset) => [asset.id, byPath.get(asset.storage_path) ?? ""])));
    setAssets(rows);
  }, [orgId, supabase]);

  useEffect(() => {
    let active = true;
    const refresh = () => { if (active) void load(); };
    refresh();
    window.addEventListener(ASSETS_CHANGED, refresh);
    return () => { active = false; window.removeEventListener(ASSETS_CHANGED, refresh); };
  }, [load]);

  async function upload(files: FileList | null, wanted: Kind) {
    if (!files?.length) return;
    setUploading(true);
    const results: Message[] = [];
    let added = 0;
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const isFont = wanted === "font";
      const mime = isFont ? FONT_MIME[ext] : file.type;
      if (isFont ? !mime : !IMAGE_TYPES.has(mime)) {
        results.push({ tone: "error", text: `${file.name}: filtypen støttes ikke.` });
        continue;
      }
      if (file.size > (isFont ? MAX_FONT : MAX_IMAGE)) {
        results.push({ tone: "error", text: `${file.name}: filen er større enn ${isFont ? "5" : "10"} MB.` });
        continue;
      }
      const hash = await sha256(file);
      const { data: existing } = await supabase.from("brand_assets").select("original_name").eq("org_id", orgId).eq("content_hash", hash).maybeSingle();
      if (existing) {
        results.push({ tone: "info", text: `${file.name} ligger allerede i biblioteket${existing.original_name !== file.name ? ` som ${existing.original_name}` : ""}.` });
        continue;
      }
      const path = `${orgId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: mime, upsert: false });
      if (uploadError) {
        // Lagringen sier nei når biblioteket er fullt (300 filer per bedrift).
        results.push({ tone: "error", text: /row-level security|policy/i.test(uploadError.message)
          ? `${file.name}: biblioteket er fullt. Slett filer du ikke bruker, og prøv igjen.`
          : `${file.name}: kunne ikke lastes opp. Prøv igjen.` });
        continue;
      }
      const { error: insertError } = await supabase.from("brand_assets").insert({
        org_id: orgId, kind: wanted, original_name: file.name.slice(0, 180), storage_path: path,
        mime_type: mime, file_size: file.size, content_hash: hash,
      });
      if (insertError) {
        await supabase.storage.from(BUCKET).remove([path]);
        results.push(insertError.code === "23505"
          ? { tone: "info", text: `${file.name} ligger allerede i biblioteket.` }
          : { tone: "error", text: `${file.name}: kunne ikke registreres.` });
        continue;
      }
      added++;
    }
    if (added) results.unshift({ tone: "success", text: added === 1 ? "1 fil er lagt til." : `${added} filer er lagt til.` });
    setMessages(results);
    await load();
    if (wanted === "font" && added) window.dispatchEvent(new Event(FONTS_CHANGED));
    setUploading(false);
  }

  async function run(asset: Asset, action: () => Promise<{ error: { message: string } | null }>, success: string) {
    setBusy(asset.id);
    const { error } = await action();
    setMessages([error ? { tone: "error", text: "Endringen ble ikke lagret. Prøv igjen." } : { tone: "success", text: success }]);
    await load();
    if (asset.kind === "font") window.dispatchEvent(new Event(FONTS_CHANGED));
    setBusy(null);
  }

  const makePrimaryLogo = (asset: Asset) => run(asset, async () => {
    const cleared = await supabase.from("brand_assets").update({ is_primary: false }).eq("org_id", orgId).eq("kind", "logo").eq("is_primary", true);
    if (cleared.error) return cleared;
    return supabase.from("brand_assets").update({ is_primary: true }).eq("org_id", orgId).eq("id", asset.id);
  }, `${asset.original_name} er nå hovedlogoen.`);

  const changeKind = (asset: Asset, kind: "image" | "logo") => run(asset,
    async () => supabase.from("brand_assets").update({ kind, is_primary: false }).eq("org_id", orgId).eq("id", asset.id),
    kind === "logo" ? `${asset.original_name} er merket som logo.` : `${asset.original_name} er merket som bilde.`);

  const remove = (asset: Asset) => {
    if (!window.confirm(`Slette ${asset.original_name} fra biblioteket? Det kan ikke angres.`)) return;
    return run(asset, async () => {
      // Raden slettes først. Feiler fjerningen av selve filen etterpå, er den bare usynlig.
      const deleted = await supabase.from("brand_assets").delete().eq("org_id", orgId).eq("id", asset.id);
      if (deleted.error) return deleted;
      await supabase.storage.from(BUCKET).remove([asset.storage_path]);
      return { error: null };
    }, `${asset.original_name} er slettet.`);
  };

  const logos = (assets ?? []).filter((a) => a.kind === "logo");
  const images = (assets ?? []).filter((a) => a.kind === "image");
  const fonts = (assets ?? []).filter((a) => a.kind === "font");

  const uploadButton = (label: string, kind: Kind, accept: string) => (
    <label className={"inline-flex cursor-pointer items-center rounded-full border border-ink px-4 py-2 text-sm font-semibold focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-spot " + (uploading ? "pointer-events-none opacity-50" : "")}>
      {label}
      <input className="sr-only" type="file" accept={accept} multiple disabled={uploading} onChange={(e) => { void upload(e.currentTarget.files, kind); e.currentTarget.value = ""; }} />
    </label>
  );

  const card = (asset: Asset) => (
    <li key={asset.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line">
      <div className={"relative aspect-[4/3] " + (asset.kind === "logo" ? "bg-paper p-4" : "bg-mist")}>
        {urls[asset.id] ? (
          // eslint-disable-next-line @next/next/no-img-element -- signerte, private adresser som utløper; next/image gir ingen gevinst her
          <img src={urls[asset.id]} alt={asset.original_name} className={"size-full " + (asset.kind === "logo" ? "object-contain" : "object-cover")} />
        ) : null}
        {asset.is_primary ? <span className="absolute top-2 left-2 rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-paper">Hovedlogo</span> : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 border-t border-line p-3">
        <p className="truncate text-sm font-semibold" title={asset.original_name}>{asset.original_name}</p>
        <p className="text-xs text-ink-soft">{sizeLabel(asset.file_size)}</p>
        <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs font-semibold">
          {asset.kind === "logo" && !asset.is_primary ? <button type="button" disabled={busy === asset.id} onClick={() => void makePrimaryLogo(asset)} className="underline underline-offset-2">Bruk som hovedlogo</button> : null}
          <button type="button" disabled={busy === asset.id} onClick={() => void changeKind(asset, asset.kind === "logo" ? "image" : "logo")} className="underline underline-offset-2">
            {asset.kind === "logo" ? "Er et bilde" : "Er en logo"}
          </button>
          <button type="button" disabled={busy === asset.id} onClick={() => void remove(asset)} className="text-spot underline underline-offset-2">Slett</button>
        </div>
      </div>
    </li>
  );

  return (
    <section id="bibliotek" className="flex scroll-mt-24 flex-col gap-6 border-t border-line pt-8" aria-labelledby="bibliotek-tittel">
      <div>
        <h2 id="bibliotek-tittel" className="text-2xl font-bold tracking-tight">Logoer, bilder og fonter</h2>
        <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
          Filene ligger privat hos bedriften. Spott bruker dem når innlegg og grafikk lages.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {uploadButton("Last opp logo", "logo", "image/jpeg,image/png,image/webp,image/avif")}
        {uploadButton("Last opp bilder", "image", "image/jpeg,image/png,image/webp,image/avif")}
        {uploadButton("Last opp fonter", "font", ".woff2,.woff,.ttf,.otf")}
      </div>
      <p className="-mt-3 text-sm text-ink-soft">Bilder: JPG, PNG, WebP eller AVIF, opptil 10 MB. Fonter: WOFF2, WOFF, TTF eller OTF, opptil 5 MB.</p>

      {uploading ? <Notice tone="info">Laster opp …</Notice> : null}
      {messages.map((message, i) => <Notice key={i} tone={message.tone}>{message.text}</Notice>)}

      {assets === null ? <p className="text-sm text-ink-soft">Henter filene …</p> : (
        <>
          <div className="flex flex-col gap-3">
            <h3 className="font-bold">Logoer <span className="font-normal text-ink-soft">({logos.length})</span></h3>
            {logos.length ? (
              <>
                {!logos.some((l) => l.is_primary) ? <p className="text-sm text-ink-soft">Velg hvilken logo som er hovedlogoen.</p> : null}
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">{logos.map(card)}</ul>
              </>
            ) : <p className="rounded-xl bg-mist px-4 py-4 text-sm text-ink-soft">Ingen logo ennå.</p>}
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="font-bold">Bilder <span className="font-normal text-ink-soft">({images.length})</span></h3>
            {images.length ? <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">{images.map(card)}</ul>
              : <p className="rounded-xl bg-mist px-4 py-4 text-sm text-ink-soft">Ingen bilder ennå.</p>}
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="font-bold">Fonter <span className="font-normal text-ink-soft">({fonts.length})</span></h3>
            {fonts.length ? (
              <ul className="divide-y divide-line rounded-2xl border border-line">
                {fonts.map((asset) => (
                  <li key={asset.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{asset.original_name}</p>
                      <p className="text-xs text-ink-soft">{sizeLabel(asset.file_size)}</p>
                    </div>
                    <button type="button" disabled={busy === asset.id} onClick={() => void remove(asset)} className="shrink-0 text-xs font-semibold text-spot underline underline-offset-2">Slett</button>
                  </li>
                ))}
              </ul>
            ) : <p className="rounded-xl bg-mist px-4 py-4 text-sm text-ink-soft">Ingen fonter ennå. Du kan også velge fonter fra Google under Typografi.</p>}
            {fonts.length ? <p className="text-sm text-ink-soft">Velg hvor fontene skal brukes under <a href="#typografi" className="font-semibold underline">Typografi</a>.</p> : null}
          </div>
        </>
      )}
    </section>
  );
}
