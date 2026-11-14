"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Notice } from "@/components/notice";
import { requestJson } from "@/lib/api-client";
import { ENUM_FIELDS, SECTIONS, fieldLabel, type SectionKey } from "@/lib/ai/brand-analysis-labels";
import type { BrandAnalysis } from "@/lib/ai/brand-analysis-schema";

/** Bare vanlige nettadresser blir lenker. Alt annet (ugyldig tekst, javascript:-adresser) hoppes over. */
function webUrl(value: unknown): URL | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

type Status = "ready" | "needs_review" | "approved" | "not_created";
type Path = (string | number)[];

type Props = {
  initialAnalysis: BrandAnalysis | null;
  initialStatus: Status;
  analyzedAt: string | null;
  approvedAt: string | null;
  websiteUrl: string | null;
  profileWebsite: string | null;
  sourcePages: { url: string; depth: number }[];
  model: string | null;
  stale: boolean;
  organizationName: string;
};

// Tomme maler, så «Legg til» lager et gyldig element også når listen er tom.
const ITEM_TEMPLATES: Partial<Record<SectionKey, Record<string, unknown>>> = {
  offerings: { name: "", description: "", targetAudience: [], customerBenefits: [], features: [], evidence: [] },
  audiences: { segment: "", needs: [], painPoints: [], motivations: [], objections: [], decisionCriteria: [], messagingAngle: "" },
  messagingPillars: { pillar: "", coreMessage: "", supportingPoints: [], proof: [] },
  customerJourney: { stage: "", customerQuestion: "", contentNeed: "", recommendedAction: "" },
  opportunities: { opportunity: "", expectedImpact: "", effort: "medium", priority: "medium", firstStep: "" },
  evidence: { claim: "", sourceUrl: null, evidence: "", confidence: "medium" },
};

const ITEM_TITLE: Record<string, string> = {
  offerings: "name", audiences: "segment", messagingPillars: "pillar", customerJourney: "stage", opportunities: "opportunity", evidence: "claim",
};

const STATUS_LABEL: Record<Status, string> = {
  approved: "Godkjent", needs_review: "Trenger gjennomgang", ready: "Klar til gjennomgang", not_created: "Ikke laget",
};

function updatePath(value: unknown, path: Path, next: unknown): unknown {
  if (!path.length) return next;
  const [head, ...tail] = path;
  if (Array.isArray(value)) {
    const copy = [...value];
    copy[Number(head)] = updatePath(copy[Number(head)], tail, next);
    return copy;
  }
  const record = (value ?? {}) as Record<string, unknown>;
  return { ...record, [String(head)]: updatePath(record[String(head)], tail, next) };
}

const inputClass = "w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm leading-relaxed text-ink focus:border-ink focus:outline-none";
// Tekstfelt vokser med innholdet der nettleseren støtter det, så ingenting skjules.
const textareaClass = inputClass + " min-h-11 resize-y [field-sizing:content]";

const parseLines = (text: string) => text.split("\n").map((line) => line.trim()).filter(Boolean);

/**
 * Liste med ett punkt per linje. Teksten holdes lokalt mens du skriver, så et nytt linjeskift
 * ikke forsvinner før du har rukket å skrive neste punkt.
 */
function ListField({ id, label, value, onChange }: { id: string; label: string; value: string[]; onChange: (items: string[]) => void }) {
  const [text, setText] = useState(value.join("\n"));
  const [last, setLast] = useState(value);
  if (value !== last) {
    setLast(value);
    if (parseLines(text).join("\n") !== value.join("\n")) setText(value.join("\n"));
  }
  return (
    <label className="block min-w-0" htmlFor={id}>
      <span className="mb-1.5 block text-xs font-semibold text-ink-soft">
        {label} <span className="font-normal">(ett punkt per linje)</span>
      </span>
      <textarea
        id={id}
        rows={Math.min(8, Math.max(3, value.length + 1))}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const items = parseLines(e.target.value);
          setLast(items);
          onChange(items);
        }}
        onBlur={() => setText(parseLines(text).join("\n"))}
        className={textareaClass}
      />
    </label>
  );
}

function Field({ value, path, onChange }: { value: unknown; path: Path; onChange: (path: Path, value: unknown) => void }) {
  const key = String(path[path.length - 1]);
  const id = "felt-" + path.join("-");

  if (key in ENUM_FIELDS && typeof value === "string") {
    return (
      <label className="block min-w-0" htmlFor={id}>
        <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{fieldLabel(key)}</span>
        <select id={id} value={value} onChange={(e) => onChange(path, e.target.value)} className={inputClass}>
          {ENUM_FIELDS[key].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
    );
  }
  if (typeof value === "string" || (key === "sourceUrl" && value === null)) {
    const text = value ?? "";
    return (
      <label className="block min-w-0" htmlFor={id}>
        <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{fieldLabel(key)}</span>
        <textarea
          id={id}
          rows={text.length > 120 ? 4 : 2}
          value={text}
          onChange={(e) => onChange(path, key === "sourceUrl" && !e.target.value.trim() ? null : e.target.value)}
          className={textareaClass}
        />
      </label>
    );
  }
  if (Array.isArray(value)) {
    const template = path.length === 1 ? ITEM_TEMPLATES[key as SectionKey] : undefined;
    if (!template) {
      return <ListField id={id} label={fieldLabel(key)} value={value as string[]} onChange={(items) => onChange(path, items)} />;
    }
    const titleKey = ITEM_TITLE[key];
    return (
      <div className="flex flex-col gap-4">
        {value.length === 0 ? <p className="rounded-xl bg-mist px-4 py-3 text-sm text-ink-soft">Ingen ennå.</p> : null}
        {value.map((item, index) => {
          const title = titleKey ? String((item as Record<string, unknown>)[titleKey] ?? "").trim() : "";
          return (
            <section key={index} className="rounded-2xl border border-line p-4" aria-label={title || `Nummer ${index + 1}`}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <h4 className="min-w-0 text-sm font-semibold">{title || `Nummer ${index + 1}`}</h4>
                <button type="button" onClick={() => onChange(path, value.filter((_, i) => i !== index))} className="shrink-0 text-xs font-semibold text-spot underline underline-offset-4">
                  Fjern
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(item as Record<string, unknown>).map(([childKey, childValue]) => (
                  <div key={childKey} className={typeof childValue === "string" && childValue.length > 80 ? "sm:col-span-2" : ""}>
                    <Field value={childValue} path={[...path, index, childKey]} onChange={onChange} />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
        <div>
          <button type="button" onClick={() => onChange(path, [...value, structuredClone(template)])} className="rounded-full border border-ink px-4 py-2 text-sm font-semibold">
            Legg til
          </button>
        </div>
      </div>
    );
  }
  if (value && typeof value === "object") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(value as Record<string, unknown>).map(([childKey, childValue]) => (
          <div key={childKey} className={Array.isArray(childValue) || (typeof childValue === "string" && childValue.length > 80) ? "sm:col-span-2" : ""}>
            <Field value={childValue} path={[...path, childKey]} onChange={onChange} />
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
    </div>
  );
}

/** AI-ens egen vurdering av analysen. Vises, men redigeres ikke. */
function QualityView({ quality }: { quality: BrandAnalysis["quality"] }) {
  const confidence = ENUM_FIELDS.confidence.find((o) => o.value === quality.confidence)?.label ?? quality.confidence;
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-ink-soft">
        Dette er AI-ens egen vurdering av hvor sikker analysen er. Den endres når analysen lages på nytt.
      </p>
      <dl className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-mist p-4"><dt className="text-xs font-semibold text-ink-soft">Sikkerhet</dt><dd className="mt-1 text-lg font-bold">{confidence}</dd></div>
        <div className="rounded-xl bg-mist p-4"><dt className="text-xs font-semibold text-ink-soft">Fullstendighet</dt><dd className="mt-1 text-lg font-bold tabular-nums">{quality.completeness} %</dd></div>
      </dl>
      <List title="Antakelser å sjekke" items={quality.assumptions} />
      <List title="Det som mangler" items={quality.missingInformation} />
      <List title="Spørsmål til dere" items={quality.questionsForCustomer} />
    </div>
  );
}

function formatDate(value: string, withTime = false) {
  return new Intl.DateTimeFormat("nb-NO", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(new Date(value));
}

export function BrandAnalysisEditor(props: Props) {
  const [analysis, setAnalysis] = useState<BrandAnalysis | null>(props.initialAnalysis);
  const [status, setStatus] = useState<Status>(props.initialStatus);
  const [approvedAt, setApprovedAt] = useState(props.approvedAt);
  const [analyzedAt, setAnalyzedAt] = useState(props.analyzedAt);
  const [sourcePages, setSourcePages] = useState(props.sourcePages);
  const [stale, setStale] = useState(props.stale);
  const [active, setActive] = useState<SectionKey>("brandOverview");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  // Advarer før siden lukkes med ulagrede endringer.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save(approve: boolean) {
    if (!analysis) return;
    setSaving(true);
    setMessage(null);
    try {
      const result = await requestJson<{ status: Status; approvedAt: string | null; stale?: boolean }>("/api/brand-analysis", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis, approved: approve }),
      }, "Lagringen feilet. Prøv igjen.");
      setStatus(result.status);
      setApprovedAt(result.approvedAt);
      if (result.stale === false) setStale(false);
      setDirty(false);
      setMessage({ tone: "success", text: approve ? "Analysen er godkjent. Spott bruker den når innhold lages." : "Endringene er lagret. Godkjenn når du er fornøyd." });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Lagringen feilet." });
    } finally {
      setSaving(false);
    }
  }

  async function generate() {
    const replacing = Boolean(analysis);
    const warning = replacing
      ? "Spott leser nettsiden på nytt og lager en ny analyse. Den erstatter analysen du har nå" + (status === "approved" || dirty ? ", også endringene og godkjenningen din" : "") + ". Fortsette?"
      : null;
    if (warning && !window.confirm(warning)) return;
    setGenerating(true);
    setMessage({ tone: "info", text: "Spott leser nettsiden og skriver analysen. Det tar som regel ett til to minutter." });
    try {
      const result = await requestJson<{ analysis: BrandAnalysis; status: Status; analyzedAt: string | null; sourcePages?: { url: string; depth: number }[]; remaining?: number }>(
        "/api/brand-analysis", { method: "POST" }, "Kunne ikke lage analysen. Prøv igjen.",
      );
      setAnalysis(result.analysis);
      setStatus(result.status);
      setApprovedAt(null);
      setAnalyzedAt(result.analyzedAt);
      setSourcePages(result.sourcePages ?? []);
      setStale(false);
      setDirty(false);
      setActive("brandOverview");
      const left = typeof result.remaining === "number" ? ` Dere kan lage ${result.remaining} til i dag.` : "";
      setMessage({ tone: "success", text: "Ny analyse er laget. Les gjennom og godkjenn." + left });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Kunne ikke lage analysen." });
    } finally {
      setGenerating(false);
    }
  }

  if (!analysis) {
    return (
      <section className="rounded-3xl border border-line p-6 sm:p-10">
        <div className="max-w-xl">
          <h2 className="text-2xl font-bold tracking-tight">Ingen analyse ennå</h2>
          <p className="mt-3 leading-relaxed text-ink-soft">
            Spott leser nettsiden og profilen, og skriver en analyse av merkevaren: målgrupper, tone, budskap og muligheter.
            Du kan rette alt etterpå.
          </p>
          {props.profileWebsite ? (
            <p className="mt-3 text-sm text-ink-soft">Nettside: {props.profileWebsite}</p>
          ) : (
            <Notice tone="info">Legg inn nettsiden i <Link href="/profil" className="font-semibold underline">profilen</Link> først.</Notice>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => void generate()} disabled={generating || !props.profileWebsite} className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper disabled:opacity-50">
              {generating ? "Lager analysen …" : "Lag analysen"}
            </button>
            <Link href="/profil" className="rounded-full border border-ink px-6 py-3 text-sm font-semibold">Gå til profilen</Link>
          </div>
          {message ? <div className="mt-5"><Notice tone={message.tone}>{message.text}</Notice></div> : null}
        </div>
      </section>
    );
  }

  const approved = status === "approved";
  const activeIndex = SECTIONS.findIndex(([key]) => key === active);
  const onChange = (path: Path, next: unknown) => {
    setAnalysis((current) => updatePath(current, path, next) as BrandAnalysis);
    setDirty(true);
    setMessage(null);
  };

  return (
    <div className="flex flex-col gap-5">
      <section className="on-dark rounded-3xl bg-ink p-6 text-paper sm:p-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <span className={"rounded-full px-3 py-1 font-semibold " + (approved ? "bg-paper text-ink" : "bg-paper/15")}>{STATUS_LABEL[status]}</span>
          {analyzedAt ? <span className="text-ink-muted">Laget {formatDate(analyzedAt)}</span> : null}
          {approved && approvedAt ? <span className="text-ink-muted">Godkjent {formatDate(approvedAt, true)}</span> : null}
        </div>
        <h2 className="mt-4 max-w-2xl text-2xl font-bold tracking-tight text-balance">{analysis.brandOverview.oneLiner || props.organizationName}</h2>
        {analysis.brandOverview.summary ? <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">{analysis.brandOverview.summary}</p> : null}
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={() => void save(true)} disabled={saving || generating || (approved && !dirty)} className="rounded-full bg-paper px-5 py-2.5 text-sm font-semibold text-ink disabled:opacity-50">
            {saving ? "Lagrer …" : approved && !dirty ? "Godkjent" : dirty ? "Lagre og godkjenn" : "Godkjenn analysen"}
          </button>
          <button type="button" onClick={() => void save(false)} disabled={saving || generating || !dirty} className="rounded-full border border-paper/40 px-5 py-2.5 text-sm font-semibold disabled:opacity-40">
            Lagre utkast
          </button>
          <button type="button" onClick={() => void generate()} disabled={saving || generating} className="rounded-full border border-paper/40 px-5 py-2.5 text-sm font-semibold disabled:opacity-40">
            {generating ? "Lager ny analyse …" : "Lag ny analyse"}
          </button>
        </div>
        {dirty ? <p className="mt-3 text-sm text-ink-muted">Du har endringer som ikke er lagret.</p> : null}
      </section>

      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      {stale && !generating ? (
        <Notice tone="info">
          Profilen er endret etter at analysen ble laget. Lag en ny analyse hvis endringene skal være med.
        </Notice>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
        <nav aria-label="Kapitler i analysen" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0 lg:flex-col lg:overflow-visible">
          {SECTIONS.map(([key, name]) => (
            <button
              key={key}
              type="button"
              aria-current={active === key ? "true" : undefined}
              onClick={() => setActive(key)}
              className={"shrink-0 rounded-full px-4 py-2 text-left text-sm font-semibold lg:rounded-xl lg:py-2.5 " + (active === key ? "bg-ink text-paper" : "border border-line text-ink-soft hover:text-ink")}
            >
              {name}
            </button>
          ))}
        </nav>
        <section className="min-w-0 rounded-3xl border border-line p-5 sm:p-7" aria-labelledby="kapittel">
          <h3 id="kapittel" className="mb-6 text-2xl font-bold tracking-tight">{SECTIONS[activeIndex][1]}</h3>
          {active === "quality"
            ? <QualityView quality={analysis.quality} />
            : <Field value={analysis[active]} path={[active]} onChange={onChange} />}
          <div className="mt-8 flex justify-between gap-3 border-t border-line pt-5">
            <button type="button" onClick={() => setActive(SECTIONS[Math.max(0, activeIndex - 1)][0])} disabled={activeIndex === 0} className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold disabled:opacity-30">
              Forrige
            </button>
            <button type="button" onClick={() => setActive(SECTIONS[Math.min(SECTIONS.length - 1, activeIndex + 1)][0])} disabled={activeIndex === SECTIONS.length - 1} className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold disabled:opacity-30">
              Neste
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-line p-5 sm:p-7">
        <h3 className="font-bold">Kilder</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Laget fra {sourcePages.length} {sourcePages.length === 1 ? "side" : "sider"} på {webUrl(props.websiteUrl)?.hostname ?? "nettsiden"}
          {props.model ? ` med ${props.model}` : ""}.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {sourcePages.slice(0, 12).map((page) => webUrl(page?.url)).filter((url) => url !== null).map((url) => (
            <li key={url.href} className="min-w-0 max-w-full">
              <a href={url.href} target="_blank" rel="noreferrer" className="block truncate rounded-full bg-mist px-3 py-1.5 text-xs font-medium underline underline-offset-2">
                {url.pathname}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
