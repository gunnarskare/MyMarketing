"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Notice } from "@/components/notice";
import type { BrandProfile } from "@/lib/brand-profile";
import { saveAssistantAnswer, submitBrandRequests } from "./actions";

type Asset = { id: string; kind: string; original_name: string };
type FieldName = "website_url" | "tone" | "audience" | "products" | "avoid";
type Step = { id: string; title: string; prompt: string; field?: FieldName; placeholder?: string; options?: string[] };

const STEPS: Step[] = [
  { id: "website", title: "Hvor finner vi bedriften?", prompt: "Har bedriften en nettside? Spott leser den for å forstå hva dere driver med.", field: "website_url", placeholder: "dinbedrift.no" },
  { id: "offer", title: "Hva tilbyr dere?", prompt: "Fortell kort hva dere selger eller leverer, og hva kundene bør huske dere for.", field: "products", placeholder: "Vi baker brød og leverer lunsj til bedrifter i sentrum …" },
  { id: "audience", title: "Hvem vil dere nå?", prompt: "Hvem er de viktigste kundene? Privatpersoner, bedrifter eller en bestemt bransje.", field: "audience", placeholder: "Folk som bor og jobber i sentrum …" },
  { id: "voice", title: "Hvordan skal dere høres ut?", prompt: "Velg et uttrykk, eller skriv med egne ord. Det kan justeres senere.", field: "tone", options: ["Vennlig og folkelig", "Profesjonell og faglig", "Moderne og energisk", "Eksklusiv og elegant", "Leken og kreativ"] },
  { id: "avoid", title: "Er det noe Spott skal styre unna?", prompt: "Ord, temaer eller påstander dere ikke vil bruke. Valgfritt.", field: "avoid", placeholder: "Vi lover aldri laveste pris …" },
];

const SERVICES = [
  "Lage en logo eller flere logovarianter",
  "Utvikle fargepalett og fargeuttrykk",
  "Finne skrifttyper som passer merkevaren",
  "Lage en bildestil og visuelle eksempler",
  "Lage en komplett merkevareguide",
];

const FIELD_OF: Record<string, keyof BrandProfile> = { website: "website_url", offer: "products", audience: "audience", voice: "tone", avoid: "avoid" };

export function BrandAssistant({ orgName, profile, assets, hasTypography }: { orgName: string; profile: BrandProfile | null; assets: Asset[]; hasTypography: boolean }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [saved, setSaved] = useState<Record<string, string>>(() =>
    Object.fromEntries(STEPS.map((s) => [s.id, String(profile?.[FIELD_OF[s.id]] ?? "")])),
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [requests, setRequests] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const step = STEPS[stepIndex];
  const value = drafts[step.id] ?? saved[step.id] ?? "";
  const progress = done ? 100 : Math.round((stepIndex / STEPS.length) * 100);
  const hasLogo = assets.some((a) => a.kind === "logo");
  const hasImages = assets.some((a) => a.kind === "image");
  const hasFonts = hasTypography || assets.some((a) => a.kind === "font");

  function next() {
    setMessage(null);
    if (stepIndex === STEPS.length - 1) setDone(true);
    else setStepIndex((i) => i + 1);
  }

  function saveAndContinue() {
    const field = step.field;
    if (!field) return next();
    if (value === saved[step.id]) return next();
    startTransition(async () => {
      const result = await saveAssistantAnswer(field, value);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.message ?? "Noe gikk galt." });
        return;
      }
      setSaved((current) => ({ ...current, [step.id]: value.trim() }));
      setDrafts((current) => { const copy = { ...current }; delete copy[step.id]; return copy; });
      next();
    });
  }

  const status = [
    { label: "Nettside", ok: Boolean(saved.website) },
    { label: "Tilbud", ok: Boolean(saved.offer) },
    { label: "Målgruppe", ok: Boolean(saved.audience) },
    { label: "Tone", ok: Boolean(saved.voice) },
    { label: "Logo", ok: hasLogo },
    { label: "Bilder", ok: hasImages },
    { label: "Fonter", ok: hasFonts },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section className="rounded-3xl border border-line" aria-labelledby="veiviser-tittel">
        <div className="border-b border-line p-5 sm:p-7">
          <div className="flex items-center justify-between text-sm text-ink-soft">
            <span>{done ? "Ferdig" : `Spørsmål ${stepIndex + 1} av ${STEPS.length}`}</span>
            <span>{orgName}</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-mist" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Fremdrift">
            <div className="h-full rounded-full bg-spot transition-[width]" style={{ width: progress + "%" }} />
          </div>
        </div>

        <div className="p-5 sm:p-7">
          {!done ? (
            <>
              <h2 id="veiviser-tittel" className="text-2xl font-bold tracking-tight">{step.title}</h2>
              <p className="mt-2 max-w-xl leading-relaxed text-ink-soft">{step.prompt}</p>
              <label htmlFor="svar" className="sr-only">{step.title}</label>
              {step.options ? (
                <div className="mt-5 flex flex-col gap-3">
                  <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Forslag">
                    {step.options.map((option) => (
                      <button key={option} type="button" aria-pressed={value === option} onClick={() => setDrafts((c) => ({ ...c, [step.id]: option }))} className={"rounded-2xl border px-4 py-3 text-left text-sm font-semibold " + (value === option ? "border-ink bg-mist" : "border-line hover:border-ink")}>
                        {option}
                      </button>
                    ))}
                  </div>
                  <textarea id="svar" value={value} onChange={(e) => setDrafts((c) => ({ ...c, [step.id]: e.target.value }))} rows={2} placeholder="Eller beskriv med egne ord …" className="w-full rounded-2xl border border-line bg-paper px-4 py-3 text-base" />
                </div>
              ) : step.field === "website_url" ? (
                <input id="svar" type="text" inputMode="url" autoComplete="url" value={value} onChange={(e) => setDrafts((c) => ({ ...c, [step.id]: e.target.value }))} placeholder={step.placeholder} className="mt-5 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-base" />
              ) : (
                <textarea id="svar" value={value} onChange={(e) => setDrafts((c) => ({ ...c, [step.id]: e.target.value }))} rows={4} placeholder={step.placeholder} className="mt-5 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-base" />
              )}
              {message ? <div className="mt-4"><Notice tone={message.tone}>{message.text}</Notice></div> : null}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <button type="button" disabled={stepIndex === 0 || pending} onClick={() => { setMessage(null); setStepIndex((i) => Math.max(0, i - 1)); }} className="text-sm font-semibold text-ink-soft underline underline-offset-4 disabled:opacity-40">
                  Tilbake
                </button>
                <div className="flex gap-2">
                  <button type="button" disabled={pending} onClick={next} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold">Hopp over</button>
                  <button type="button" disabled={pending} onClick={saveAndContinue} className="rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-paper disabled:opacity-50">
                    {pending ? "Lagrer …" : "Lagre og fortsett"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 id="veiviser-tittel" className="text-2xl font-bold tracking-tight">Profilen er på plass</h2>
              <p className="mt-2 leading-relaxed text-ink-soft">
                Neste steg er merkevareanalysen. Spott leser nettsiden og skriver hva den forstår om bedriften, og du retter det som ikke stemmer.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/merkevare" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper">Til merkevareanalysen</Link>
                <Link href="/profil#hent-fra-nettside" className="rounded-full border border-ink px-5 py-2.5 text-sm font-semibold">Hent logo og bilder</Link>
              </div>

              <div className="mt-8 border-t border-line pt-6">
                <h3 className="font-bold">Trenger dere hjelp med det visuelle?</h3>
                <p className="mt-1 text-sm text-ink-soft">Kryss av for det dere ønsker hjelp med.</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {SERVICES.map((item) => (
                    <label key={item} className={"flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-sm font-semibold " + (requests.includes(item) ? "border-ink bg-mist" : "border-line")}>
                      <input type="checkbox" checked={requests.includes(item)} onChange={() => setRequests((c) => (c.includes(item) ? c.filter((x) => x !== item) : [...c, item]))} className="mt-0.5 accent-spot" />
                      {item}
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={pending || submitted || requests.length === 0}
                  onClick={() => startTransition(async () => {
                    const result = await submitBrandRequests(requests);
                    if (!result.ok) return setMessage({ tone: "error", text: result.message ?? "Kunne ikke sende ønskene." });
                    setSubmitted(true);
                    setMessage({ tone: "success", text: "Takk! Ønskene er registrert på kontoen." });
                  })}
                  className="mt-4 rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-paper disabled:opacity-40"
                >
                  {pending ? "Sender …" : submitted ? "Sendt" : "Send ønskene"}
                </button>
                {message ? <div className="mt-4"><Notice tone={message.tone}>{message.text}</Notice></div> : null}
              </div>
            </>
          )}
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        <div className="rounded-3xl border border-line p-5">
          <h3 className="font-bold">Status</h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {status.map((row) => (
              <li key={row.label} className="flex items-center justify-between gap-2">
                <span className="text-ink-soft">{row.label}</span>
                <span className={"font-semibold " + (row.ok ? "text-ok" : "text-ink-soft")}>{row.ok ? "På plass" : "Mangler"}</span>
              </li>
            ))}
          </ul>
          <Link href="/profil" className="mt-4 inline-block text-sm font-semibold underline underline-offset-4">Se hele profilen</Link>
        </div>
        <p className="rounded-3xl bg-mist p-5 text-sm leading-relaxed text-ink-soft">
          Spott foreslår, du bestemmer. Ingenting publiseres uten at du har godkjent det.
        </p>
      </aside>
    </div>
  );
}
