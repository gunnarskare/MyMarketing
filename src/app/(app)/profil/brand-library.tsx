"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Asset = {
  id: string;
  kind: "image" | "logo" | "font";
  original_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  is_primary: boolean;
  created_at: string;
};

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const FONT_EXTENSIONS = new Set(["woff2", "woff", "ttf", "otf"]);
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_FONT_SIZE = 5 * 1024 * 1024;

function getFileKind(file: File): Asset["kind"] | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (IMAGE_TYPES.has(file.type)) return "image";
  if (FONT_EXTENSIONS.has(extension)) return "font";
  return null;
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BrandLibrary({ orgId }: { orgId: string }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: queryError } = await supabase
      .from("brand_assets")
      .select("id, kind, original_name, storage_path, mime_type, file_size, is_primary, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (queryError) {
      setError("Kunne ikke hente merkevareressursene. Kontroller at databasen er oppdatert.");
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as Asset[];
    setAssets(rows);
    const imageRows = rows.filter((asset) => asset.kind !== "font");
    const signed = await Promise.all(imageRows.map(async (asset) => {
      const { data: urlData } = await supabase.storage
        .from("brand-assets")
        .createSignedUrl(asset.storage_path, 60 * 60);
      return [asset.id, urlData?.signedUrl ?? ""] as const;
    }));
    setPreviews(Object.fromEntries(signed.filter(([, url]) => Boolean(url))));
    setLoading(false);
  }, [orgId, supabase]);

  useEffect(() => { void loadAssets(); }, [loadAssets]);

  async function uploadFiles(files: FileList | null, kindOverride?: "logo") {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    setMessage("");
    let uploaded = 0;

    for (const file of Array.from(files)) {
      const kind = kindOverride ?? getFileKind(file);
      if (!kind) {
        setError(`${file.name}: Filtypen støttes ikke. Bruk JPG, PNG, WebP, AVIF, WOFF2, WOFF, TTF eller OTF.`);
        continue;
      }
      if (kind === "font" && file.size > MAX_FONT_SIZE) {
        setError(`${file.name}: Skrifttyper kan maksimalt være 5 MB.`);
        continue;
      }
      if (kind !== "font" && (!IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_SIZE)) {
        setError(`${file.name}: Bilder må være JPG, PNG, WebP eller AVIF og maksimalt 10 MB.`);
        continue;
      }
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `${orgId}/${crypto.randomUUID()}.${extension}`;
      const mime = file.type || (extension === "woff2" ? "font/woff2" : extension === "woff" ? "font/woff" : extension === "ttf" ? "font/ttf" : extension === "otf" ? "font/otf" : "application/octet-stream");

      const { error: uploadError } = await supabase.storage
        .from("brand-assets")
        .upload(path, file, { contentType: mime, upsert: false });
      if (uploadError) {
        setError(`Kunne ikke laste opp ${file.name}: ${uploadError.message}`);
        continue;
      }
      const { error: insertError } = await supabase.from("brand_assets").insert({
        org_id: orgId,
        kind,
        original_name: file.name,
        storage_path: path,
        mime_type: mime,
        file_size: file.size,
      });
      if (insertError) {
        await supabase.storage.from("brand-assets").remove([path]);
        setError(`Filen ${file.name} ble lastet opp, men kunne ikke registreres. Prøv igjen.`);
        continue;
      }
      uploaded++;
    }

    if (uploaded) setMessage(`${uploaded} ${uploaded === 1 ? "fil er" : "filer er"} lagt til i merkevarebiblioteket.`);
    await loadAssets();
    setUploading(false);
  }

  async function setPrimary(asset: Asset) {
    setBusyId(asset.id);
    setError("");
    const { error: clearError } = await supabase
      .from("brand_assets")
      .update({ is_primary: false })
      .eq("org_id", orgId)
      .eq("kind", "font");
    if (clearError) {
      setError("Kunne ikke oppdatere skrifttypen.");
      setBusyId(null);
      return;
    }
    const { error: updateError } = await supabase
      .from("brand_assets")
      .update({ is_primary: true })
      .eq("id", asset.id)
      .eq("org_id", orgId);
    if (updateError) setError("Kunne ikke velge skrifttypen.");
    else setMessage(`${asset.original_name} er valgt som primær skrifttype.`);
    await loadAssets();
    setBusyId(null);
  }

  async function removeAsset(asset: Asset) {
    if (!window.confirm(`Slette ${asset.original_name} fra merkevarebiblioteket?`)) return;
    setBusyId(asset.id);
    setError("");
    const { error: storageError } = await supabase.storage.from("brand-assets").remove([asset.storage_path]);
    if (storageError) {
      setError("Filen kunne ikke slettes fra lagringen.");
      setBusyId(null);
      return;
    }
    const { error: rowError } = await supabase.from("brand_assets").delete().eq("id", asset.id).eq("org_id", orgId);
    if (rowError) setError("Filen ble fjernet fra lagringen, men metadata kunne ikke slettes.");
    else setMessage("Ressursen er slettet.");
    await loadAssets();
    setBusyId(null);
  }

  const images = assets.filter((asset) => asset.kind !== "font");
  const fonts = assets.filter((asset) => asset.kind === "font");

  return (
    <section className="flex flex-col gap-6 border-t border-line pt-8" aria-labelledby="brand-library-title">
      <div>
        <p className="text-xs font-bold tracking-[0.16em] text-spot uppercase">VISUELL IDENTITET</p>
        <h2 id="brand-library-title" className="mt-2 text-2xl font-semibold tracking-tight">Merkevarebibliotek</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Last opp bilder, logoer og skrifttyper som Spott skal bruke som referanse når den lager innhold for bedriften.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-dashed border-line bg-white p-5 transition-colors hover:border-ink">
          <span className="flex size-10 items-center justify-center rounded-xl bg-mist"><span aria-hidden>▧</span></span>
          <span className="font-semibold">Last opp bilder</span>
          <span className="text-xs leading-relaxed text-ink-soft">JPG, PNG, WebP eller AVIF · maks 10 MB per bilde</span>
          <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={uploading} onChange={(event) => { void uploadFiles(event.currentTarget.files); event.currentTarget.value = ""; }} />
        </label>
        <label className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-dashed border-line bg-white p-5 transition-colors hover:border-ink">
          <span className="flex size-10 items-center justify-center rounded-xl bg-mist"><span aria-hidden>Aa</span></span>
          <span className="font-semibold">Last opp skrifttyper</span>
          <span className="text-xs leading-relaxed text-ink-soft">WOFF2, WOFF, TTF eller OTF · maks 5 MB per font</span>
          <input className="sr-only" type="file" accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf" multiple disabled={uploading} onChange={(event) => { void uploadFiles(event.currentTarget.files); event.currentTarget.value = ""; }} />
        </label>
      </div>

      {uploading ? <p className="text-sm text-ink-soft" role="status">Laster opp filer …</p> : null}
      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p> : null}
      {message ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{message}</p> : null}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">Bilder og logoer</h3>
          <span className="text-xs text-ink-soft">{images.length} filer</span>
        </div>
        {loading ? <p className="text-sm text-ink-soft">Henter biblioteket …</p> : images.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((asset) => (
              <article key={asset.id} className="overflow-hidden rounded-2xl border border-line bg-white">
                <div className="aspect-[4/3] bg-mist">
                  {previews[asset.id] ? <img src={previews[asset.id]} alt={asset.original_name} className="size-full object-cover" /> : <div className="flex size-full items-center justify-center text-sm text-ink-soft">Forhåndsvisning ikke tilgjengelig</div>}
                </div>
                <div className="flex flex-col gap-2 p-3">
                  <p className="truncate text-sm font-semibold" title={asset.original_name}>{asset.original_name}</p>
                  <p className="text-xs text-ink-soft">{asset.kind === "logo" ? "Logo" : "Bilde"} · {formatSize(asset.file_size)}</p>
                  <button type="button" disabled={busyId === asset.id} onClick={() => void removeAsset(asset)} className="self-start text-xs font-semibold text-red-700 underline underline-offset-2 disabled:opacity-50">Slett</button>
                </div>
              </article>
            ))}
          </div>
        ) : !loading ? <p className="rounded-xl bg-mist/70 px-4 py-5 text-sm text-ink-soft">Ingen bilder er lastet opp ennå.</p> : null}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">Skrifttyper</h3>
          <span className="text-xs text-ink-soft">{fonts.length} fonter</span>
        </div>
        {loading ? null : fonts.length ? (
          <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
            {fonts.map((asset) => (
              <li key={asset.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{asset.original_name}</p>
                  <p className="mt-1 text-xs text-ink-soft">{formatSize(asset.file_size)} · {asset.mime_type}</p>
                  {asset.is_primary ? <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">Primær skrifttype</span> : null}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {!asset.is_primary ? <button type="button" disabled={busyId === asset.id} onClick={() => void setPrimary(asset)} className="text-xs font-semibold underline underline-offset-2 disabled:opacity-50">Bruk som primær</button> : null}
                  <button type="button" disabled={busyId === asset.id} onClick={() => void removeAsset(asset)} className="text-xs font-semibold text-red-700 underline underline-offset-2 disabled:opacity-50">Slett</button>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="rounded-xl bg-mist/70 px-4 py-5 text-sm text-ink-soft">Ingen skrifttyper er lastet opp ennå.</p>}
      </div>
      <p className="text-xs leading-relaxed text-ink-soft">Filene lagres privat for bedriften. Bare medlemmer av bedriftens Spott-konto kan hente dem. AI-integrasjonen som automatisk velger ressurser, kobles på i neste steg.</p>
    </section>
  );
}
