"use client";

import { useState } from "react";

type Candidate = { url: string; name: string; category: string };
type Analysis = { website: string; assets: Candidate[]; colors: string[]; fonts: string[] };

export function BrandWebsiteImporter() {
  const [website, setWebsite] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function analyze() {
    setBusy(true); setError(""); setMessage(""); setAnalysis(null); setSelected([]);
    try {
      const trimmedWebsite = website.trim();
      const normalizedWebsite = /^https?:\/\//i.test(trimmedWebsite) ? trimmedWebsite : "https://" + trimmedWebsite;
      const response = await fetch("/api/brand-intelligence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "analyze", website: normalizedWebsite }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kunne ikke analysere nettsiden.");
      setAnalysis(data); setSelected(data.assets.map((a: Candidate) => a.url));
      if (!data.assets.length) setMessage("Fant ingen bilder i støttede formater. Farger og skrifttyper ble likevel analysert.");
    } catch (e) { setError(e instanceof Error ? e.message : "Noe gikk galt."); }
    finally { setBusy(false); }
  }

  async function importSelected() {
    if (!analysis || !selected.length) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/brand-intelligence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "import", selected: analysis.assets.filter(a => selected.includes(a.url)) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Importen feilet.");
      setMessage(data.count + " filer er importert til merkevarebiblioteket." + (data.failures?.length ? " " + data.failures.length + " filer ble hoppet over." : ""));
      if (data.failures?.length) setError(data.failures.join(" · "));
    } catch (e) { setError(e instanceof Error ? e.message : "Importen feilet."); }
    finally { setBusy(false); }
  }

  return <section className="flex flex-col gap-5 rounded-3xl border border-line bg-white p-5 sm:p-7" aria-labelledby="website-import-title">
    <div><p className="text-xs font-bold tracking-[0.16em] text-spot uppercase">AI-MERKEVAREANALYSE</p><h2 id="website-import-title" className="mt-2 text-2xl font-semibold">Hent merkevare fra nettside</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">Spott analyserer nettsiden og finner bilder, logoer, ikoner, fargepalett og skrifttyper. Velg selv hva som skal importeres til bedriftens private merkevarebibliotek.</p></div>
    <form className="flex flex-col gap-3 sm:flex-row" onSubmit={e=>{e.preventDefault();void analyze();}}>
      <input type="text" inputMode="url" value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://malina.no" required className="min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-paper px-4 text-sm outline-none focus:border-ink"/>
      <button type="submit" disabled={busy || !website.trim()} className="min-h-12 rounded-full bg-ink px-6 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Analyserer …" : "Analyser nettside"}</button>
    </form>
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
    {message ? <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p> : null}
    {analysis ? <>
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold">Funnet på {new URL(analysis.website).hostname}</h3><p className="text-xs text-ink-soft">{analysis.assets.length} bilder og grafikkelementer · {analysis.colors.length} fargeverdier</p></div><button type="button" onClick={()=>setSelected(analysis.assets.map(a=>a.url))} className="text-xs font-semibold underline">Velg alle</button></div>
      {analysis.assets.length ? <div className="flex flex-col gap-5">{[...new Set(analysis.assets.map(asset=>asset.category))].map(category=><div key={category}><h4 className="mb-2 text-sm font-semibold">{category} <span className="font-normal text-ink-soft">({analysis.assets.filter(asset=>asset.category===category).length})</span></h4><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{analysis.assets.filter(asset=>asset.category===category).map(asset=><label key={asset.url} className={"cursor-pointer overflow-hidden rounded-2xl border " + (selected.includes(asset.url) ? "border-ink ring-1 ring-ink" : "border-line")}><div className="flex aspect-[4/3] items-center justify-center bg-mist"><img src={asset.url} alt="" loading="lazy" className="size-full object-contain"/></div><div className="flex items-start gap-2 p-3"><input type="checkbox" checked={selected.includes(asset.url)} onChange={e=>setSelected(current=>e.target.checked ? [...current,asset.url] : current.filter(x=>x!==asset.url))} className="mt-0.5"/><span className="min-w-0"><span className="block truncate text-xs font-semibold">{asset.name}</span><span className="text-[11px] text-ink-soft">{asset.category}</span></span></div></label>)}</div></div>)}</div> : null}
      {analysis.colors.length ? <div><h3 className="mb-2 text-sm font-semibold">Oppdagede farger</h3><div className="flex flex-wrap gap-2">{analysis.colors.map(color=><span key={color} title={color} className="flex items-center gap-2 rounded-full border border-line px-2 py-1 text-xs"><span className="size-5 rounded-full border border-black/10" style={{backgroundColor:color}}/>{color}</span>)}</div></div> : null}
      {analysis.fonts.length ? <div><h3 className="mb-2 text-sm font-semibold">Mulige skrifttyper / CSS-referanser</h3><ul className="list-inside list-disc text-xs text-ink-soft">{analysis.fonts.map(font=><li key={font}>{font}</li>)}</ul></div> : null}
      <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={()=>void importSelected()} disabled={busy || !selected.length} className="min-h-11 rounded-full bg-ink px-6 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Importerer …" : "Importer " + selected.length + " valgte filer"}</button><span className="text-xs text-ink-soft">Du godkjenner filene før de lagres.</span></div>
    </> : null}
    <p className="text-xs leading-relaxed text-ink-soft">Importøren finner offentlig tilgjengelige bilder og grafikkelementer i sidens HTML, responsive bildekilder og innebygde CSS-stiler. Eksterne CSS-filer, innloggede områder og grafikk som tegnes dynamisk i JavaScript kan kreve egen støtte. Den følger ikke innlogginger eller betalingsmurer, og blokkerer lokale/private nettverksadresser. Kontroller at du har rett til å bruke materialet du importerer.</p>
  </section>;
}
