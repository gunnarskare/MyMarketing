"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Notice } from "@/components/notice";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_TYPOGRAPHY, FONT_NAME, GOOGLE_FONT_SUGGESTIONS, TYPOGRAPHY_ROLES, WEIGHTS,
  fallbackFor, normalizeTypography, validateTypography,
  type TypographyAssignment, type TypographyRole, type TypographySettings,
} from "@/lib/typography";
import { FONTS_CHANGED } from "./brand-library";

type FontAsset = { id: string; original_name: string; storage_path: string };
type LoadState = "loading" | "ok" | "missing" | "offline";

const linkId = (family: string) => "gf-" + family.toLowerCase().replace(/[^a-z0-9]+/g, "-");

const cssUrl = (family: string) => "https://fonts.googleapis.com/css2?family=" + encodeURIComponent(family).replace(/%20/g, "+") + "&display=swap";
const checked = new Map<string, Promise<LoadState>>();

/**
 * Sjekker om Google har fonten, og laster den i forhåndsvisningen.
 * «missing» betyr at Google svarte at fonten ikke finnes. «offline» betyr at vi ikke fikk svar
 * (for eksempel en annonseblokker eller et nettverk som stenger Google), og da stopper vi ikke lagringen.
 */
function loadGoogleFont(family: string): Promise<LoadState> {
  if (!FONT_NAME.test(family)) return Promise.resolve("missing");
  if (!checked.has(family)) {
    checked.set(family, (async (): Promise<LoadState> => {
      let state: LoadState;
      try {
        const response = await fetch(cssUrl(family), { mode: "cors" });
        state = response.ok ? "ok" : response.status === 400 || response.status === 404 ? "missing" : "offline";
      } catch {
        state = "offline";
      }
      if (state !== "missing" && !document.getElementById(linkId(family))) {
        const link = document.createElement("link");
        link.id = linkId(family);
        link.rel = "stylesheet";
        link.href = cssUrl(family);
        document.head.appendChild(link);
      }
      return state;
    })());
  }
  return checked.get(family)!;
}

/** Skrivefelt for fontnavn. Navnet lagres først når du er ferdig, så hver bokstav ikke laster en ny font. */
function FontNameInput({ id, value, onCommit }: { id: string; value: string; onCommit: (family: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }
  const commit = (next: string) => {
    const family = next.trim().replace(/\s+/g, " ");
    if (family && family !== value) onCommit(family);
    else setDraft(value);
  };
  return (
    <input
      id={id}
      list="google-fonter"
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        // Valg fra forslagslisten lagres med en gang.
        if (GOOGLE_FONT_SUGGESTIONS.includes(e.target.value)) commit(e.target.value);
      }}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(e.currentTarget.value); } }}
      className="w-full rounded-xl border border-line bg-paper px-3 py-2.5"
      autoComplete="off"
      spellCheck={false}
    />
  );
}

export function TypographyEditor({ orgId }: { orgId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [settings, setSettings] = useState<TypographySettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [fonts, setFonts] = useState<FontAsset[]>([]);
  const [googleState, setGoogleState] = useState<Record<string, LoadState>>({});
  const [uploadedReady, setUploadedReady] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  const loadFonts = useCallback(async () => {
    const { data } = await supabase.from("brand_assets").select("id,original_name,storage_path").eq("org_id", orgId).eq("kind", "font").order("created_at", { ascending: false });
    setFonts((data ?? []) as FontAsset[]);
  }, [orgId, supabase]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.from("brand_typography").select("settings").eq("org_id", orgId).maybeSingle();
      if (!active) return;
      setSaved(Boolean(data));
      setSettings(normalizeTypography(data?.settings));
      await loadFonts();
    })();
    const onFontsChanged = () => void loadFonts();
    window.addEventListener(FONTS_CHANGED, onFontsChanged);
    return () => { active = false; window.removeEventListener(FONTS_CHANGED, onFontsChanged); };
  }, [orgId, supabase, loadFonts]);

  // Sjekker og laster Google-fonter for forhåndsvisningen.
  useEffect(() => {
    if (!settings) return;
    let active = true;
    for (const item of Object.values(settings)) {
      if (item.source !== "google") continue;
      void loadGoogleFont(item.family).then((state) => {
        if (active) setGoogleState((current) => (current[item.family] === state ? current : { ...current, [item.family]: state }));
      });
    }
    return () => { active = false; };
  }, [settings]);

  // Laster opplastede fonter for forhåndsvisningen, via midlertidige private lenker.
  const requested = useRef(new Set<string>());
  useEffect(() => {
    if (!settings) return;
    for (const item of Object.values(settings)) {
      const asset = item.source === "upload" ? fonts.find((f) => f.id === item.assetId) : undefined;
      if (!asset || requested.current.has(asset.id)) continue;
      requested.current.add(asset.id);
      void (async () => {
        const { data } = await supabase.storage.from("brand-assets").createSignedUrl(asset.storage_path, 3600);
        try {
          if (!data?.signedUrl) throw new Error("ingen lenke");
          const face = new FontFace("spott-" + asset.id, `url(${JSON.stringify(data.signedUrl)})`);
          document.fonts.add(await face.load());
          setUploadedReady((c) => ({ ...c, [asset.id]: true }));
        } catch {
          setUploadedReady((c) => ({ ...c, [asset.id]: false }));
        }
      })();
    }
  }, [settings, fonts, supabase]);

  function update(role: TypographyRole, patch: Partial<TypographyAssignment>) {
    setSettings((current) => (current ? { ...current, [role]: { ...current[role], ...patch } } : current));
    setDirty(true);
    setMessage(null);
  }

  async function save() {
    if (!settings) return;
    const problem = validateTypography(settings, fonts.map((f) => f.id));
    if (problem) return setMessage({ tone: "error", text: problem });
    const missing = Object.values(settings).find((item) => item.source === "google" && googleState[item.family] === "missing");
    if (missing) return setMessage({ tone: "error", text: `Fant ikke «${missing.family}» hos Google Fonts. Sjekk stavemåten.` });
    setSaving(true);
    const { error } = await supabase.from("brand_typography").upsert({ org_id: orgId, settings, updated_at: new Date().toISOString() }, { onConflict: "org_id" });
    setSaving(false);
    if (error) return setMessage({ tone: "error", text: "Kunne ikke lagre typografien. Prøv igjen." });
    setSaved(true);
    setDirty(false);
    setMessage({ tone: "success", text: "Typografien er lagret." });
  }

  if (!settings) return <p id="typografi" className="border-t border-line pt-8 text-sm text-ink-soft">Henter typografi …</p>;

  return (
    <section id="typografi" className="flex scroll-mt-24 flex-col gap-5 border-t border-line pt-8" aria-labelledby="typografi-tittel">
      <div>
        <h2 id="typografi-tittel" className="text-2xl font-bold tracking-tight">Typografi</h2>
        <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
          Hvilke fonter innleggene og grafikken skal bruke. Skriv navnet på en font fra Google Fonts, eller velg en du har lastet opp.
        </p>
        {!saved ? <p className="mt-2 text-sm text-ink-soft">Ikke lagret ennå. Forslaget under er et nøytralt utgangspunkt.</p> : null}
      </div>

      <datalist id="google-fonter">{GOOGLE_FONT_SUGGESTIONS.map((font) => <option key={font} value={font} />)}</datalist>

      <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line">
        {TYPOGRAPHY_ROLES.map((role) => {
          const item = settings[role.key];
          const asset = fonts.find((f) => f.id === item.assetId);
          const state = item.source === "google" ? googleState[item.family] ?? "loading" : asset ? (uploadedReady[asset.id] === false ? "missing" : "ok") : "missing";
          const previewFamily = item.source === "google" ? `"${item.family}", ${item.fallback}` : asset ? `"spott-${asset.id}", ${item.fallback}` : "inherit";
          const inputId = `font-${role.key}`;
          return (
            <li key={role.key} className="grid gap-4 p-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:p-5">
              <div className="flex flex-col gap-2">
                <label htmlFor={inputId} className="font-semibold">{role.label}</label>
                <p className="-mt-1 text-sm text-ink-soft">{role.description}</p>
                <div className="flex gap-1 rounded-full bg-mist p-1 text-sm" role="group" aria-label={`Kilde for ${role.label.toLowerCase()}`}>
                  <button type="button" aria-pressed={item.source === "google"} onClick={() => update(role.key, { source: "google", assetId: null, family: item.source === "google" ? item.family : DEFAULT_TYPOGRAPHY[role.key].family })} className={"flex-1 rounded-full px-3 py-1.5 font-semibold " + (item.source === "google" ? "bg-paper shadow-sm" : "text-ink-soft")}>Google</button>
                  <button type="button" aria-pressed={item.source === "upload"} onClick={() => update(role.key, { source: "upload", assetId: fonts[0]?.id ?? null, family: fonts[0]?.original_name.replace(/\.[^.]+$/, "") ?? "" })} className={"flex-1 rounded-full px-3 py-1.5 font-semibold " + (item.source === "upload" ? "bg-paper shadow-sm" : "text-ink-soft")}>Egen font</button>
                </div>
                {item.source === "google" ? (
                  <FontNameInput id={inputId} value={item.family} onCommit={(family) => update(role.key, { family, fallback: fallbackFor(family) })} />
                ) : fonts.length ? (
                  <select id={inputId} value={item.assetId ?? ""} onChange={(e) => { const chosen = fonts.find((f) => f.id === e.target.value); update(role.key, { assetId: chosen?.id ?? null, family: chosen?.original_name.replace(/\.[^.]+$/, "") ?? "" }); }} className="w-full rounded-xl border border-line bg-paper px-3 py-2.5">
                    {fonts.map((font) => <option key={font.id} value={font.id}>{font.original_name}</option>)}
                  </select>
                ) : (
                  <p className="text-sm text-ink-soft">Ingen egne fonter ennå. Last opp under <a href="#bibliotek" className="font-semibold underline">Logoer, bilder og fonter</a>.</p>
                )}
              </div>
              <div className="flex min-w-0 flex-col justify-center gap-2 rounded-xl bg-mist px-4 py-4">
                <p style={{ fontFamily: previewFamily, fontWeight: role.key === "body" ? 400 : Math.max(...item.weights) }} className={"leading-snug break-words " + (role.key === "display" ? "text-4xl" : role.key === "heading" ? "text-2xl" : role.key === "button" ? "text-base" : "text-base")}>
                  {role.sample}
                </p>
                {state === "missing" && item.source === "google" ? <p className="text-sm font-semibold text-spot">Fant ikke «{item.family}» hos Google Fonts. Sjekk stavemåten.</p> : null}
                {state === "offline" && item.source === "google" ? <p className="text-sm text-ink-soft">Fikk ikke hentet forhåndsvisningen fra Google Fonts. Du kan likevel lagre.</p> : null}
                {item.source === "upload" && item.assetId && !asset ? <p className="text-sm font-semibold text-spot">Fonten er slettet fra biblioteket.</p> : null}
                <details className="text-sm">
                  <summary className="cursor-pointer text-ink-soft">Snitt: {item.weights.join(", ")}</summary>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {WEIGHTS.map((weight) => (
                      <label key={weight} className="flex items-center gap-1.5 rounded-lg border border-line bg-paper px-2 py-1">
                        <input type="checkbox" className="accent-spot" checked={item.weights.includes(weight)} onChange={(e) => update(role.key, { weights: e.target.checked ? [...item.weights, weight].sort((a, b) => a - b) : item.weights.filter((w) => w !== weight) })} />
                        {weight}
                      </label>
                    ))}
                  </div>
                </details>
              </div>
            </li>
          );
        })}
      </ul>

      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void save()} disabled={saving || (saved && !dirty)} className="rounded-full bg-ink px-6 py-3 font-semibold text-paper disabled:opacity-50">
          {saving ? "Lagrer …" : saved && !dirty ? "Lagret" : "Lagre typografien"}
        </button>
        <button type="button" onClick={() => { setSettings(DEFAULT_TYPOGRAPHY); setDirty(true); setMessage({ tone: "info", text: "Tilbakestilt til standard. Lagre for å bruke det." }); }} className="text-sm font-semibold underline underline-offset-4">
          Tilbakestill
        </button>
      </div>
      <p className="text-sm text-ink-soft">Forhåndsvisningen henter fontene fra Google Fonts.</p>
    </section>
  );
}
