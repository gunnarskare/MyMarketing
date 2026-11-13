"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Asset = { id: string; kind: "image" | "logo" | "font"; original_name: string; storage_path: string; mime_type: string; file_size: number; is_primary: boolean };
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const FONT_EXTENSIONS = new Set(["woff2", "woff", "ttf", "otf"]);
const sizeLabel = (n: number) => n < 1048576 ? Math.round(n / 1024) + " KB" : (n / 1048576).toFixed(1) + " MB";

export function BrandLibrary({ orgId }: { orgId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [urls, setUrls] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error: e } = await supabase.from("brand_assets")
      .select("id,kind,original_name,storage_path,mime_type,file_size,is_primary")
      .eq("org_id", orgId).order("created_at", { ascending: false });
    if (e) { setError("Kunne ikke hente biblioteket. Databasemigreringen må være aktivert."); setLoading(false); return; }
    const rows = (data ?? []) as Asset[];
    setAssets(rows);
    const signed = await Promise.all(rows.filter(x => x.kind !== "font").map(async x => {
      const { data: d } = await supabase.storage.from("brand-assets").createSignedUrl(x.storage_path, 3600);
      return [x.id, d?.signedUrl ?? ""] as const;
    }));
    setUrls(Object.fromEntries(signed.filter(x => x[1])));
    setLoading(false);
  }, [orgId, supabase]);
  useEffect(() => { void refresh(); }, [refresh]);

  async function upload(files: FileList | null, forcedKind?: "logo") {
    if (!files?.length) return;
    setUploading(true); setError(""); setNotice("");
    let count = 0;
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const kind = forcedKind ?? (IMAGE_TYPES.has(file.type) ? "image" : FONT_EXTENSIONS.has(ext) ? "font" : null);
      if (!kind || (kind === "font" && file.size > 5*1048576) || (kind !== "font" && (!IMAGE_TYPES.has(file.type) || file.size > 10*1048576))) {
        setError(file.name + ": Filtypen eller størrelsen støttes ikke. Bilder maks 10 MB, fonter maks 5 MB.");
        continue;
      }
      const mime = file.type || ({woff2:"font/woff2",woff:"font/woff",ttf:"font/ttf",otf:"font/otf"} as Record<string,string>)[ext] || "application/octet-stream";
      const path = orgId + "/" + crypto.randomUUID() + "." + ext;
      const { error: up } = await supabase.storage.from("brand-assets").upload(path,file,{contentType:mime,upsert:false});
      if (up) { setError("Kunne ikke laste opp " + file.name + ": " + up.message); continue; }
      const { error: db } = await supabase.from("brand_assets").insert({org_id:orgId,kind,original_name:file.name,storage_path:path,mime_type:mime,file_size:file.size});
      if (db) { await supabase.storage.from("brand-assets").remove([path]); setError("Filen kunne ikke registreres i biblioteket."); continue; }
      count++;
    }
    if (count) setNotice(count + (count === 1 ? " fil lagt til." : " filer lagt til."));
    await refresh(); setUploading(false);
  }
  async function chooseFont(asset: Asset) {
    setBusy(asset.id); setError("");
    const { error: e1 } = await supabase.from("brand_assets").update({is_primary:false}).eq("org_id",orgId).eq("kind","font");
    const { error: e2 } = e1 ? {error:e1} : await supabase.from("brand_assets").update({is_primary:true}).eq("id",asset.id).eq("org_id",orgId);
    if (e2) setError("Kunne ikke velge skrifttypen."); else setNotice(asset.original_name + " er valgt som primær skrifttype.");
    await refresh(); setBusy(null);
  }
  async function remove(asset: Asset) {
    if (!window.confirm("Slette " + asset.original_name + " fra biblioteket?")) return;
    setBusy(asset.id); setError("");
    const { error: e1 } = await supabase.storage.from("brand-assets").remove([asset.storage_path]);
    if (e1) { setError("Filen kunne ikke slettes."); setBusy(null); return; }
    const { error: e2 } = await supabase.from("brand_assets").delete().eq("id",asset.id).eq("org_id",orgId);
    if (e2) setError("Filen ble fjernet, men metadata kunne ikke slettes.");
    await refresh(); setBusy(null);
  }
  const images = assets.filter(a => a.kind !== "font");
  const fonts = assets.filter(a => a.kind === "font");
  const uploadCard = (title:string, detail:string, accept:string, onChange:(f:FileList|null)=>void) => (
    <label className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-dashed border-line bg-white p-5 hover:border-ink">
      <span className="flex size-10 items-center justify-center rounded-xl bg-mist text-lg">{title === "Skrifttyper" ? "Aa" : "▧"}</span>
      <span className="font-semibold">Last opp {title.toLowerCase()}</span>
      <span className="text-xs leading-relaxed text-ink-soft">{detail}</span>
      <input className="sr-only" type="file" accept={accept} multiple disabled={uploading} onChange={e => {onChange(e.currentTarget.files);e.currentTarget.value="";}} />
    </label>
  );

  return <section className="flex flex-col gap-6 border-t border-line pt-8" aria-labelledby="brand-library-title">
    <div><p className="text-xs font-bold tracking-[0.16em] text-spot uppercase">VISUELL IDENTITET</p><h2 id="brand-library-title" className="mt-2 text-2xl font-semibold">Merkevarebibliotek</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">Last opp bilder, logoer og skrifttyper som Spott skal bruke som referanse når den lager innhold for bedriften.</p></div>
    <div className="grid gap-3 sm:grid-cols-3">
      {uploadCard("Bilder","JPG, PNG, WebP eller AVIF · maks 10 MB","image/jpeg,image/png,image/webp,image/avif",f=>void upload(f))}
      {uploadCard("Logo","JPG, PNG, WebP eller AVIF · maks 10 MB","image/jpeg,image/png,image/webp,image/avif",f=>void upload(f,"logo"))}
      {uploadCard("Skrifttyper","WOFF2, WOFF, TTF eller OTF · maks 5 MB",".woff2,.woff,.ttf,.otf",f=>void upload(f))}
    </div>
    {uploading ? <p className="text-sm text-ink-soft" role="status">Laster opp …</p> : null}
    {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
    {notice ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p> : null}
    <div className="flex flex-col gap-3"><div className="flex justify-between"><h3 className="font-semibold">Bilder og logoer</h3><span className="text-xs text-ink-soft">{images.length} filer</span></div>
      {loading ? <p className="text-sm text-ink-soft">Henter biblioteket …</p> : images.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{images.map(a=><article key={a.id} className="overflow-hidden rounded-2xl border border-line bg-white"><div className="aspect-[4/3] bg-mist">{urls[a.id] ? <img src={urls[a.id]} alt={a.original_name} className="size-full object-cover"/> : null}</div><div className="p-3"><p className="truncate text-sm font-semibold" title={a.original_name}>{a.original_name}</p><p className="mt-1 text-xs text-ink-soft">{a.kind === "logo" ? "Logo" : "Bilde"} · {sizeLabel(a.file_size)}</p><button type="button" disabled={busy===a.id} onClick={()=>void remove(a)} className="mt-2 text-xs font-semibold text-red-700 underline">Slett</button></div></article>)}</div> : <p className="rounded-xl bg-mist/70 px-4 py-5 text-sm text-ink-soft">Ingen bilder er lastet opp ennå.</p>}
    </div>
    <div className="flex flex-col gap-3"><div className="flex justify-between"><h3 className="font-semibold">Skrifttyper</h3><span className="text-xs text-ink-soft">{fonts.length} fonter</span></div>
      {!loading && (fonts.length ? <ul className="divide-y divide-line rounded-2xl border border-line bg-white">{fonts.map(a=><li key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-semibold">{a.original_name}</p><p className="mt-1 text-xs text-ink-soft">{sizeLabel(a.file_size)} · {a.mime_type}</p>{a.is_primary ? <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">Primær skrifttype</span> : null}</div><div className="flex gap-3">{!a.is_primary ? <button type="button" disabled={busy===a.id} onClick={()=>void chooseFont(a)} className="text-xs font-semibold underline">Bruk som primær</button> : null}<button type="button" disabled={busy===a.id} onClick={()=>void remove(a)} className="text-xs font-semibold text-red-700 underline">Slett</button></div></li>)}</ul> : <p className="rounded-xl bg-mist/70 px-4 py-5 text-sm text-ink-soft">Ingen skrifttyper er lastet opp ennå.</p>)}
    </div>
    <p className="text-xs leading-relaxed text-ink-soft">Filene lagres privat for bedriften. Bare medlemmer av bedriftens Spott-konto kan hente dem. Automatisk bruk i AI-generert innhold kobles på i neste utviklingssteg.</p>
  </section>;
}
