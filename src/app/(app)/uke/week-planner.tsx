"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Notice } from "@/components/notice";
import { requestJson } from "@/lib/api-client";
import { DAYS, DAY_LABEL, PLATFORM_LABEL, PLATFORMS, osloParts, postForCopy, type Platform } from "@/lib/week";
import { deletePost, rewritePost, savePost, setPostStatus, type PostRow } from "./actions";

export type WeekOption = { value: "this" | "next"; label: string; days: number };
type Message = { tone: "success" | "error" | "info"; text: string };

const LIMIT: Record<Platform, number> = { facebook: 3000, instagram: 2200, linkedin: 3000 };
const STATUS_LABEL: Record<PostRow["status"], string> = { draft: "Utkast", approved: "Godkjent", published: "Publisert" };

function dayHeading(date: string, weekday: number): string {
  const label = DAY_LABEL[DAYS[weekday]];
  const rest = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(date + "T00:00:00Z"));
  return label.charAt(0).toUpperCase() + label.slice(1) + " " + rest;
}

export function WeekPlanner(props: {
  access: boolean;
  analysisStatus: string | null;
  weekOptions: WeekOption[];
  plans: { start: string; label: string }[];
  selectedWeek: string | null;
  selectedLabel: string | null;
  initialPosts: PostRow[];
  assetUrls: Record<string, string>;
}) {
  const router = useRouter();
  const [posts, setPosts] = useState(props.initialPosts);
  // Nye innlegg fra serveren (etter «Lag ukas utkast») erstatter lista uten at siden må lastes på nytt.
  const [lastInitial, setLastInitial] = useState(props.initialPosts);
  if (props.initialPosts !== lastInitial) {
    setLastInitial(props.initialPosts);
    setPosts(props.initialPosts);
  }
  const ready = props.access && Boolean(props.analysisStatus);

  const update = (post: PostRow) => setPosts((current) => current.map((p) => (p.id === post.id ? post : p)));
  const remove = (id: string) => setPosts((current) => current.filter((p) => p.id !== id));

  const groups = new Map<string, { heading: string; posts: PostRow[] }>();
  for (const post of posts) {
    const when = post.scheduled_at ? osloParts(new Date(post.scheduled_at)) : null;
    const key = when?.date ?? "uten-dato";
    if (!groups.has(key)) groups.set(key, { heading: when ? dayHeading(when.date, when.weekday) : "Uten tidspunkt", posts: [] });
    groups.get(key)!.posts.push(post);
  }
  const counts = { draft: 0, approved: 0, published: 0 };
  for (const post of posts) counts[post.status]++;

  return (
    <div className="flex flex-col gap-8">
      {!props.access ? (
        <Notice tone="info">Ukeplanen krever et aktivt abonnement. <Link href="/abonnement" className="font-semibold underline">Start abonnementet</Link>.</Notice>
      ) : !props.analysisStatus ? (
        <Notice tone="info">Spott skriver ut fra merkevareanalysen. <Link href="/merkevare" className="font-semibold underline">Lag analysen først</Link>.</Notice>
      ) : props.analysisStatus !== "approved" ? (
        <Notice tone="info">Merkevareanalysen er ikke godkjent ennå. Innleggene blir bedre når du har gått gjennom den. <Link href="/merkevare" className="font-semibold underline">Se analysen</Link>.</Notice>
      ) : null}

      {posts.length ? (
        <details className="rounded-2xl border border-line p-4 sm:p-5">
          <summary className="cursor-pointer font-semibold">Lag nye utkast</summary>
          <div className="mt-4"><Generator ready={ready} options={props.weekOptions} onDone={(week) => { router.push(`/uke?uke=${week}`); router.refresh(); }} replacing /></div>
        </details>
      ) : (
        <section className="rounded-3xl border border-line p-5 sm:p-7" aria-labelledby="lag-tittel">
          <h2 id="lag-tittel" className="text-2xl font-bold tracking-tight">Lag ukas utkast</h2>
          <p className="mt-2 max-w-xl text-ink-soft">Velg uke, antall og kanaler. Spott skriver innleggene og foreslår dag, klokkeslett og bilde.</p>
          <div className="mt-5"><Generator ready={ready} options={props.weekOptions} onDone={(week) => { router.push(`/uke?uke=${week}`); router.refresh(); }} /></div>
        </section>
      )}

      {props.selectedWeek ? (
        <section className="flex flex-col gap-6" aria-labelledby="uke-tittel">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="uke-tittel" className="text-2xl font-bold tracking-tight">{props.selectedLabel}</h2>
              <p className="mt-1 text-sm text-ink-soft">{counts.draft} utkast, {counts.approved} godkjent og {counts.published} publisert</p>
            </div>
            {props.plans.length > 1 ? (
              <label className="flex items-center gap-2 text-sm">
                <span className="text-ink-soft">Vis</span>
                <select value={props.selectedWeek} onChange={(e) => router.push(`/uke?uke=${e.target.value}`)} className="rounded-xl border border-line bg-paper px-3 py-2">
                  {props.plans.map((p) => <option key={p.start} value={p.start}>{p.label}</option>)}
                </select>
              </label>
            ) : null}
          </div>
          {posts.length ? [...groups.entries()].map(([key, group]) => (
            <div key={key} className="flex flex-col gap-3">
              <h3 className="font-bold">{group.heading}</h3>
              {group.posts.map((post) => (
                <PostCard key={post.id} post={post} imageUrl={post.asset_id ? props.assetUrls[post.asset_id] : undefined} canUseAi={ready} onChange={update} onDelete={remove} />
              ))}
            </div>
          )) : <p className="rounded-2xl bg-mist p-5 text-ink-soft">Ingen innlegg i denne uka.</p>}
        </section>
      ) : null}
    </div>
  );
}

function Generator({ ready, options, onDone, replacing = false }: { ready: boolean; options: WeekOption[]; onDone: (week: string) => void; replacing?: boolean }) {
  const [week, setWeek] = useState<"this" | "next">("next");
  const [count, setCount] = useState(3);
  const [platforms, setPlatforms] = useState<Platform[]>([...PLATFORMS]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const chosen = options.find((o) => o.value === week);

  async function generate() {
    if (replacing && !window.confirm("Utkast som ikke er godkjent i den valgte uka, blir erstattet. Godkjente innlegg blir stående. Fortsette?")) return;
    setBusy(true);
    setMessage({ tone: "info", text: "Spott skriver innleggene. Det tar som regel under ett minutt." });
    try {
      const data = await requestJson<{ week: string; count: number }>(
        "/api/weekly-plan",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ week, count, platforms }) },
        "Kunne ikke lage utkastene. Prøv igjen.",
      );
      setMessage({ tone: "success", text: `${data.count} utkast er klare.` });
      onDone(data.week);
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Noe gikk galt." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void generate(); }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Uke</span>
          <select value={week} onChange={(e) => setWeek(e.target.value as "this" | "next")} className="rounded-xl border border-line bg-paper px-3 py-2.5">
            {options.map((o) => <option key={o.value} value={o.value} disabled={!o.days}>{o.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Antall innlegg</span>
          <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="rounded-xl border border-line bg-paper px-3 py-2.5">
            {[3, 5, 7].map((n) => <option key={n} value={n}>{n} innlegg</option>)}
          </select>
        </label>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold">Kanaler</legend>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <label key={p} className={"flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold focus-within:outline focus-within:outline-2 focus-within:outline-spot " + (platforms.includes(p) ? "border-ink bg-mist" : "border-line")}>
              <input type="checkbox" className="accent-spot" checked={platforms.includes(p)} onChange={(e) => setPlatforms((c) => (e.target.checked ? [...c, p] : c.filter((x) => x !== p)))} />
              {PLATFORM_LABEL[p]}
            </label>
          ))}
        </div>
      </fieldset>
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      <div>
        <button type="submit" disabled={busy || !ready || !platforms.length || !chosen?.days} className="rounded-full bg-ink px-6 py-3 font-semibold text-paper disabled:opacity-50">
          {busy ? "Skriver …" : "Lag ukas utkast"}
        </button>
      </div>
    </form>
  );
}

function PostCard({ post, imageUrl, canUseAi, onChange, onDelete }: {
  post: PostRow; imageUrl?: string; canUseAi: boolean; onChange: (post: PostRow) => void; onDelete: (id: string) => void;
}) {
  const when = post.scheduled_at ? osloParts(new Date(post.scheduled_at)) : null;
  const [text, setText] = useState(post.base_text);
  const [hashtags, setHashtags] = useState(post.hashtags.join(" "));
  const [date, setDate] = useState(when?.date ?? "");
  const [time, setTime] = useState(when?.time ?? "09:00");
  const [instruction, setInstruction] = useState("");
  const [showRewrite, setShowRewrite] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [pending, startTransition] = useTransition();
  const [lastPost, setLastPost] = useState(post);

  // Nytt innhold fra serveren (for eksempel etter omskriving) erstatter feltene.
  // Sammenlignes på innhold, så det du holder på å skrive ikke forsvinner om lista hentes på nytt.
  const content = (p: PostRow) => `${p.base_text}\n${p.hashtags.join(" ")}\n${p.scheduled_at}`;
  if (post !== lastPost && content(post) === content(lastPost)) {
    setLastPost(post);
  } else if (post !== lastPost) {
    setLastPost(post);
    setText(post.base_text);
    setHashtags(post.hashtags.join(" "));
    const next = post.scheduled_at ? osloParts(new Date(post.scheduled_at)) : null;
    setDate(next?.date ?? "");
    setTime(next?.time ?? "09:00");
  }

  const dirty = text !== post.base_text || hashtags !== post.hashtags.join(" ") || date !== (when?.date ?? "") || time !== (when?.time ?? "09:00");
  const limit = LIMIT[post.platform];
  const id = `innlegg-${post.id}`;

  const act = (fn: () => Promise<{ ok: true; post?: PostRow } | { ok: false; message: string }>, success?: string) =>
    startTransition(async () => {
      setMessage(null);
      const result = await fn();
      if (!result.ok) return setMessage({ tone: "error", text: result.message });
      if (result.post) onChange(result.post);
      if (success) setMessage({ tone: "success", text: success });
    });

  const save = () => savePost(post.id, { text, hashtags, date, time });
  const approve = () => act(async () => {
    if (dirty) {
      const saved = await save();
      if (!saved.ok) return saved;
    }
    return setPostStatus(post.id, "approved");
  }, "Godkjent. Kopier teksten og publiser når det passer.");

  async function copy() {
    try {
      await navigator.clipboard.writeText(postForCopy(text, hashtags.split(/\s+/).filter(Boolean)));
      setMessage({ tone: "success", text: `Kopiert. Lim inn på ${PLATFORM_LABEL[post.platform]}.` });
    } catch {
      setMessage({ tone: "error", text: "Kunne ikke kopiere. Marker teksten og kopier den selv." });
    }
  }

  return (
    <article className={"flex flex-col gap-4 rounded-2xl border p-4 sm:p-5 " + (post.status === "draft" ? "border-line" : "border-ink")} aria-labelledby={`${id}-tittel`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-paper">{PLATFORM_LABEL[post.platform]}</span>
        <span className={"rounded-full px-3 py-1 text-xs font-semibold " + (post.status === "draft" ? "bg-mist" : post.status === "approved" ? "bg-ok/10 text-ok" : "bg-spot/10 text-spot")}>
          {STATUS_LABEL[post.status]}{post.status === "published" && post.published_at ? ` ${new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short" }).format(new Date(post.published_at))}` : ""}
        </span>
        <span className="text-sm text-ink-soft">kl. {time}</span>
      </div>
      <h4 id={`${id}-tittel`} className="font-semibold">{post.topic || "Innlegg"}</h4>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="flex min-w-0 flex-col gap-3">
          <label className="flex flex-col gap-1.5" htmlFor={`${id}-tekst`}>
            <span className="sr-only">Tekst</span>
            <textarea id={`${id}-tekst`} value={text} onChange={(e) => setText(e.target.value)} disabled={post.status === "published"} className="min-h-32 w-full resize-y rounded-xl border border-line bg-paper px-3.5 py-3 leading-relaxed [field-sizing:content] disabled:bg-mist" />
            <span className={"text-xs " + (text.length > limit ? "font-semibold text-spot" : "text-ink-soft")}>{text.length} av maks {limit} tegn</span>
          </label>
          <label className="flex flex-col gap-1.5" htmlFor={`${id}-knagger`}>
            <span className="text-xs font-semibold text-ink-soft">Emneknagger</span>
            <input id={`${id}-knagger`} value={hashtags} onChange={(e) => setHashtags(e.target.value)} disabled={post.status === "published"} placeholder="#ingen" className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm disabled:bg-mist" />
          </label>
          {post.status !== "published" ? (
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm" htmlFor={`${id}-dato`}>
                <span className="text-ink-soft">Dato</span>
                <input id={`${id}-dato`} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl border border-line bg-paper px-2.5 py-1.5" />
              </label>
              <label className="flex items-center gap-2 text-sm" htmlFor={`${id}-tid`}>
                <span className="text-ink-soft">Klokkeslett</span>
                <input id={`${id}-tid`} type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-xl border border-line bg-paper px-2.5 py-1.5" />
              </label>
            </div>
          ) : null}
        </div>
        <div className="flex items-start gap-3 sm:flex-col sm:gap-2">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signert, privat adresse fra biblioteket
            <img src={imageUrl} alt={post.image_idea ?? "Bilde fra biblioteket"} className="aspect-square w-24 shrink-0 rounded-xl object-cover sm:w-full" />
          ) : (
            <div className="flex aspect-square w-24 shrink-0 items-center justify-center rounded-xl bg-mist p-2 text-center text-xs text-ink-soft sm:w-full sm:text-sm">Ingen bilde valgt</div>
          )}
          {post.image_idea ? <p className="text-xs leading-relaxed text-ink-soft"><span className="font-semibold">Bildeforslag:</span> {post.image_idea}</p> : null}
        </div>
      </div>

      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      <div className="flex flex-wrap items-center gap-2">
        {post.status === "draft" ? (
          <button type="button" disabled={pending || text.length > limit} onClick={approve} className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper disabled:opacity-50">
            {dirty ? "Lagre og godkjenn" : "Godkjenn"}
          </button>
        ) : null}
        {dirty && post.status !== "published" ? (
          <button type="button" disabled={pending} onClick={() => act(save, "Endringene er lagret.")} className="rounded-full border border-ink px-5 py-2.5 text-sm font-semibold disabled:opacity-50">Lagre endringer</button>
        ) : null}
        {post.status !== "draft" ? (
          <button type="button" onClick={() => void copy()} className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper">Kopier tekst</button>
        ) : null}
        {post.status === "approved" ? (
          <>
            <button type="button" disabled={pending} onClick={() => act(() => setPostStatus(post.id, "published"), "Merket som publisert.")} className="rounded-full border border-ink px-5 py-2.5 text-sm font-semibold disabled:opacity-50">Jeg har publisert</button>
            <button type="button" disabled={pending} onClick={() => act(() => setPostStatus(post.id, "draft"))} className="px-2 text-sm font-semibold text-ink-soft underline underline-offset-4">Angre godkjenning</button>
          </>
        ) : null}
        {post.status === "draft" ? (
          <button type="button" disabled={pending || !canUseAi} onClick={() => setShowRewrite((v) => !v)} className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold disabled:opacity-50" aria-expanded={showRewrite}>Skriv om</button>
        ) : null}
        <button type="button" disabled={pending} onClick={() => { if (window.confirm("Slette innlegget?")) act(async () => { const r = await deletePost(post.id); if (r.ok) onDelete(post.id); return r; }); }} className="ml-auto px-2 text-sm font-semibold text-spot underline underline-offset-4">Slett</button>
      </div>

      {showRewrite && post.status === "draft" ? (
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); act(() => rewritePost(post.id, instruction), "Skrevet om. Se over og godkjenn."); setShowRewrite(false); setInstruction(""); }}>
          <label htmlFor={`${id}-onske`} className="sr-only">Hva skal endres?</label>
          <input id={`${id}-onske`} value={instruction} onChange={(e) => setInstruction(e.target.value)} maxLength={300} placeholder="For eksempel: kortere, mer humor, nevn lunsj" className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 py-2.5 text-sm" />
          <button type="submit" disabled={pending} className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper disabled:opacity-50">{pending ? "Skriver …" : "Skriv om"}</button>
        </form>
      ) : null}
      {pending ? <p className="text-sm text-ink-soft" role="status">Jobber …</p> : null}
    </article>
  );
}
