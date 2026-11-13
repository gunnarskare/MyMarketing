"use client";

import { useState } from "react";
import { Notice } from "@/components/notice";
import { ASSETS_CHANGED } from "./brand-library";

type Candidate = { url: string; name: string; category: string; sourcePage?: string };
type Analysis = {
  website: string;
  assets: Candidate[];
  colors: { hex: string; count: number; neutral: boolean }[];
  fonts: string[];
  pages: { url: string; depth: number }[];
  failures: { url: string; error: string }[];
  stoppedEarly?: boolean;
};
type Message = { tone: "success" | "error" | "info"; text: string };

const MAX_IMPORT = 15;

export function BrandWebsiteImporter({ defaultWebsite }: { defaultWebsite: string | null }) {
  const [website, setWebsite] = useState(defaultWebsite?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? "");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState<"analyze" | "import" | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [failures, setFailures] = useState<string[]>([]);

  async function analyze() {
    setBusy("analyze");
    setMessages([]);
    setFailures([]);
    setAnalysis(null);
    setSelected([]);
    try {
      const response = await fetch("/api/brand-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze", website }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kunne ikke lese nettsiden.");
      setAnalysis(data);
      // Logoer er det folk oftest vil ha. Resten velger de selv.
      setSelected(data.assets.filter((a: Candidate) => a.category === "Logo").slice(0, MAX_IMPORT).map((a: Candidate) => a.url));
      if (!data.assets.length) setMessages([{ tone: "info", text: "Fant ingen bilder i formater vi kan hente. Farger og fonter står under." }]);
    } catch (error) {
      setMessages([{ tone: "error", text: error instanceof Error ? error.message : "Noe gikk galt." }]);
    } finally {
      setBusy(null);
    }
  }

  async function importSelected() {
    if (!analysis || !selected.length) return;
    setBusy("import");
    setMessages([]);
    setFailures([]);
    try {
      const response = await fetch("/api/brand-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import",
          selected: analysis.assets.filter((a) => selected.includes(a.url)).map(({ url, name, category }) => ({ url, name, category })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Importen feilet.");
      const result: Message[] = [];
      if (data.count) result.push({ tone: "success", text: data.count === 1 ? "1 fil er lagt i biblioteket." : `${data.count} filer er lagt i biblioteket.` });
      if (data.duplicates?.length) result.push({ tone: "info", text: `${data.duplicates.length} ${data.duplicates.length === 1 ? "fil lå" : "filer lå"} der fra før.` });
      if (data.failures?.length) result.push({ tone: "error", text: `${data.failures.length} ${data.failures.length === 1 ? "fil" : "filer"} kunne ikke hentes.` });
      setMessages(result);
      setFailures(data.failures ?? []);
      setSelected([]);
      if (data.count) window.dispatchEvent(new Event(ASSETS_CHANGED));
    } catch (error) {
      setMessages([{ tone: "error", text: error instanceof Error ? error.message : "Importen feilet." }]);
    } finally {
      setBusy(null);
    }
  }

  const toggle = (url: string, on: boolean) =>
    setSelected((current) => (on ? (current.length < MAX_IMPORT ? [...current, url] : current) : current.filter((x) => x !== url)));
  const categories = analysis ? [...new Set(analysis.assets.map((a) => a.category))] : [];
  const full = selected.length >= MAX_IMPORT;

  return (
    <section id="hent-fra-nettside" className="flex scroll-mt-24 flex-col gap-5 border-t border-line pt-8" aria-labelledby="hent-tittel">
      <div>
        <h2 id="hent-tittel" className="text-2xl font-bold tracking-tight">Hent fra nettsiden</h2>
        <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
          Spott leser opptil ti sider og finner logoer, bilder, farger og fonter. Du velger selv hva som skal inn i biblioteket.
        </p>
      </div>
      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); void analyze(); }}>
        <label htmlFor="importer-nettside" className="sr-only">Nettside</label>
        <input
          id="importer-nettside"
          type="text"
          inputMode="url"
          autoComplete="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="dinbedrift.no"
          required
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-paper px-4 text-base"
        />
        <button type="submit" disabled={busy !== null || !website.trim()} className="min-h-12 rounded-full bg-ink px-6 font-semibold text-paper disabled:opacity-50">
          {busy === "analyze" ? "Leser nettsiden …" : "Les nettsiden"}
        </button>
      </form>
      {busy === "analyze" ? <Notice tone="info">Dette tar opptil et halvt minutt.</Notice> : null}
      {messages.map((message, i) => <Notice key={i} tone={message.tone}>{message.text}</Notice>)}
      {failures.length ? (
        <details className="rounded-xl border border-line p-3 text-sm">
          <summary className="cursor-pointer font-semibold">Se hva som ikke kunne hentes</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">{failures.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </details>
      ) : null}

      {analysis ? (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-ink-soft">
            Leste {analysis.pages.length} {analysis.pages.length === 1 ? "side" : "sider"} på {new URL(analysis.website).hostname}
            {analysis.failures.length ? `, ${analysis.failures.length} kunne ikke hentes` : ""}
            {analysis.stoppedEarly ? ". Stoppet på tidsgrensen" : ""}.
          </p>

          {categories.map((category) => {
            const items = analysis.assets.filter((a) => a.category === category);
            return (
              <fieldset key={category} className="flex flex-col gap-3">
                <legend className="mb-3 font-bold">{category} <span className="font-normal text-ink-soft">({items.length})</span></legend>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {items.map((asset) => {
                    const checked = selected.includes(asset.url);
                    return (
                      <label key={asset.url} className={"flex cursor-pointer flex-col overflow-hidden rounded-2xl border focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-spot " + (checked ? "border-ink ring-1 ring-ink" : "border-line") + (full && !checked ? " opacity-50" : "")}>
                        <span className="flex aspect-[4/3] items-center justify-center bg-mist p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element -- forhåndsvisning rett fra kundens egen nettside */}
                          <img src={asset.url} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-contain" />
                        </span>
                        <span className="flex items-start gap-2 p-3">
                          <input type="checkbox" checked={checked} disabled={full && !checked} onChange={(e) => toggle(asset.url, e.target.checked)} className="mt-0.5 accent-spot" />
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold">{asset.name}</span>
                            {asset.sourcePage ? <span className="block truncate text-xs text-ink-soft">{new URL(asset.sourcePage).pathname}</span> : null}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}

          {analysis.assets.length ? (
            <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-paper/95 p-3 shadow-[0_10px_30px_-20px_rgb(16_27_59/0.5)] backdrop-blur">
              <button type="button" onClick={() => void importSelected()} disabled={busy !== null || !selected.length} className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper disabled:opacity-50">
                {busy === "import" ? "Henter filene …" : `Legg ${selected.length} ${selected.length === 1 ? "fil" : "filer"} i biblioteket`}
              </button>
              <span className="text-sm text-ink-soft">{full ? `Maks ${MAX_IMPORT} om gangen` : `${selected.length} av maks ${MAX_IMPORT} valgt`}</span>
              {selected.length ? <button type="button" onClick={() => setSelected([])} className="text-sm font-semibold underline underline-offset-2">Fjern valgene</button> : null}
            </div>
          ) : null}

          {analysis.colors.length ? (
            <div>
              <h3 className="font-bold">Farger</h3>
              <p className="mt-1 text-sm text-ink-soft">Mest brukt først. Grå og svart-hvitt står til slutt.</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {analysis.colors.map((color) => (
                  <li key={color.hex} className="flex items-center gap-2 rounded-full border border-line py-1 pr-3 pl-1 text-xs tabular-nums">
                    <span className="size-6 rounded-full border border-ink/10" style={{ backgroundColor: color.hex }} aria-hidden="true" />
                    {color.hex}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {analysis.fonts.length ? (
            <div>
              <h3 className="font-bold">Fonter</h3>
              <p className="mt-1 text-sm text-ink-soft">Fonter nettsiden bruker. Velg dem under Typografi hvis de skal gjelde innholdet også.</p>
              <ul className="mt-3 flex flex-wrap gap-2">{analysis.fonts.map((font) => <li key={font} className="rounded-full bg-mist px-3 py-1.5 text-sm">{font}</li>)}</ul>
            </div>
          ) : null}
        </div>
      ) : null}
      <p className="text-sm leading-relaxed text-ink-soft">
        Spott henter bare det som er åpent tilgjengelig, og følger ikke innlogginger. SVG-logoer lagres som PNG.
        Sjekk at bedriften har rett til å bruke bildene.
      </p>
    </section>
  );
}
