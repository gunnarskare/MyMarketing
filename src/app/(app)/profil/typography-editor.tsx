"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_TYPOGRAPHY, GOOGLE_FONT_CATALOG, TYPOGRAPHY_ROLES,
  normalizeTypography, type TypographySettings, type TypographyRole,
} from "@/lib/typography";

type FontAsset = { id: string; original_name: string; storage_path: string; mime_type: string };
const WEIGHTS = [400, 500, 600, 700, 800];

export function TypographyEditor({ orgId }: { orgId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [settings, setSettings] = useState<TypographySettings>(DEFAULT_TYPOGRAPHY);
  const [assets, setAssets] = useState<FontAsset[]>([]);
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const [{ data: row }, { data: fonts }] = await Promise.all([
        supabase.from("brand_typography").select("settings").eq("org_id", orgId).maybeSingle(),
        supabase.from("brand_assets").select("id,original_name,storage_path,mime_type").eq("org_id", orgId).eq("kind", "font").order("created_at", { ascending: false }),
      ]);
      if (!active) return;
      setSettings(normalizeTypography(row?.settings));
      setAssets((fonts ?? []) as FontAsset[]);
      setLoaded(true);
    }
    void load();
    return () => { active = false; };
  }, [orgId, supabase]);

  useEffect(() => {
    const families = [...new Set(Object.values(settings).filter(x => x.source === "google").map(x => x.family))];
    if (!families.length) return;
    const params = families.map(f => "family=" + encodeURIComponent(f).replace(/%20/g, "+") + ":wght@400;500;600;700;800").join("&");
    const href = "https://fonts.googleapis.com/css2?" + params + "&display=swap";
    const id = "spott-google-fonts";
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) { link = document.createElement("link"); link.id = id; link.rel = "stylesheet"; document.head.appendChild(link); }
    link.href = href;
  }, [settings]);

  function update(role: TypographyRole, patch: Partial<TypographySettings[TypographyRole]>) {
    setSettings(current => ({ ...current, [role]: { ...current[role], ...patch } }));
    setMessage("");
  }

  async function save() {
    setSaving(true); setError(""); setMessage("");
    const { error: saveError } = await supabase.from("brand_typography").upsert(
      { org_id: orgId, settings, updated_at: new Date().toISOString() }, { onConflict: "org_id" },
    );
    if (saveError) setError("Kunne ikke lagre typografien. Kontroller at databasen er oppdatert.");
    else setMessage("Typografien er lagret og klar som felles merkevareinnstilling.");
    setSaving(false);
  }

  const filteredFonts = GOOGLE_FONT_CATALOG.filter(f => f.toLowerCase().includes(search.toLowerCase()));
  if (!loaded) return <section className="rounded-2xl border border-line p-6 text-sm text-ink-soft">Henter typografi …</section>;

  return <section className="flex flex-col gap-6 rounded-3xl border border-line bg-white p-5 sm:p-7" aria-labelledby="typography-title">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-xs font-bold tracking-[0.16em] text-spot uppercase">FELLES MERKEVAREINNSTILLING</p><h2 id="typography-title" className="mt-2 text-2xl font-semibold">Typografi</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">Velg én skrifttype per bruksområde. Spott lagrer dette som bedriftens typografisystem, slik at nettsider, annonser og innlegg kan bruke samme oppsett.</p></div>
      <button type="button" onClick={() => {setSettings(DEFAULT_TYPOGRAPHY);setMessage("Standardoppsettet er gjenopprettet. Husk å lagre.");}} className="shrink-0 text-sm font-semibold underline underline-offset-4">Bruk Malina-oppsettet</button>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      {TYPOGRAPHY_ROLES.map(role => {
        const assignment = settings[role.key];
        const selectedAsset = assets.find(a => a.id === assignment.assetId);
        const familyOptions = filteredFonts.includes(assignment.family) ? filteredFonts : [assignment.family, ...filteredFonts];
        return <article key={role.key} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-paper/70 p-4">
          <div><h3 className="font-semibold">{role.label}</h3><p className="mt-1 text-xs leading-relaxed text-ink-soft">{role.description}</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => update(role.key,{source:"google",assetId:null})} className={"rounded-full px-3 py-1.5 text-xs font-semibold " + (assignment.source==="google" ? "bg-ink text-white" : "border border-line")}>Google Fonts</button>
            <button type="button" onClick={() => update(role.key,{source:"upload"})} className={"rounded-full px-3 py-1.5 text-xs font-semibold " + (assignment.source==="upload" ? "bg-ink text-white" : "border border-line")}>Opplastet font</button>
          </div>
          {assignment.source === "google" ? <>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Søk etter font …" aria-label="Søk i Google Fonts" className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"/>
            <select value={assignment.family} onChange={e=>update(role.key,{family:e.target.value})} className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm">
              {familyOptions.map(f=><option key={f} value={f}>{f}</option>)}
            </select>
          </> : <select value={assignment.assetId ?? ""} onChange={e=>{const asset=assets.find(a=>a.id===e.target.value);update(role.key,{assetId:e.target.value||null,family:asset?.original_name.replace(/\.[^.]+$/,"") ?? "Opplastet font"});}} className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm">
            <option value="">Velg opplastet font</option>{assets.map(a=><option key={a.id} value={a.id}>{a.original_name}</option>)}
          </select>}
          <div className="rounded-xl border border-line bg-white p-4">
            <p className="text-[10px] font-bold tracking-widest text-ink-soft uppercase">FORHÅNDSVISNING</p>
            <p style={{fontFamily: assignment.source==="google" ? '"' + assignment.family + '", ' + assignment.fallback : "inherit"}} className="mt-2 text-xl leading-snug">{role.sample}</p>
            <p className="mt-2 text-xs text-ink-soft">{assignment.family}{selectedAsset ? " · " + selectedAsset.original_name : ""}</p>
          </div>
          <label className="text-xs font-semibold text-ink-soft">Tilgjengelige snitt</label>
          <div className="flex flex-wrap gap-2">{WEIGHTS.map(weight=><label key={weight} className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-1.5 text-xs"><input type="checkbox" checked={assignment.weights.includes(weight)} onChange={e=>update(role.key,{weights:e.target.checked ? [...assignment.weights,weight].sort() : assignment.weights.filter(w=>w!==weight)})}/>{weight}</label>)}</div>
        </article>;
      })}
    </div>
    <div className="rounded-2xl bg-mist/70 p-4"><p className="text-sm font-semibold">Slik bruker Spott dette</p><p className="mt-1 text-sm leading-relaxed text-ink-soft">AI-generatorer skal hente typografien fra merkevareprofilen i stedet for å velge fonter selv. En rolle kan gjenbruke samme font som en annen, slik som DM Sans for både brødtekst og knapper.</p></div>
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    {message ? <p role="status" className="text-sm text-emerald-800">{message}</p> : null}
    <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={()=>void save()} disabled={saving} className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Lagrer …" : "Lagre typografi"}</button><span className="text-xs text-ink-soft">Gjelder hele bedriften</span></div>
  </section>;
}
