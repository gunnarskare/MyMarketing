"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type MouseEvent, type RefObject } from "react";
import {
  CalendarIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  PlusIcon,
} from "@/components/icons";
import { Notice } from "@/components/notice";
import { button, link } from "@/components/ui";
import { requestJson } from "@/lib/api-client";
import { DAYS, DAY_LABEL, PLATFORM_LABEL, PLATFORMS, addDays, osloParts, postForCopy, type Platform } from "@/lib/week";
import { deletePost, rewritePost, savePost, setPostStatus, type PostRow } from "./actions";

export type WeekOption = { value: "this" | "next"; label: string; days: number };
type Message = { tone: "success" | "error" | "info"; text: string };
type Plan = { start: string; week: number; range: string };

const LIMIT: Record<Platform, number> = { facebook: 3000, instagram: 2200, linkedin: 3000 };
const SHORT_DAY = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
const PLATFORM_ICON = { facebook: FacebookIcon, instagram: InstagramIcon, linkedin: LinkedInIcon };
const UNSAVED = "Du har endringer i innlegget som ikke er lagret. Vil du forkaste dem?";

/** «12. juni». */
function dayMonth(date: string): string {
  return new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(date + "T00:00:00Z"));
}

/** «Torsdag 12. juni kl. 10:00». */
function longWhen(date: string, time: string): string {
  if (!date) return "Ikke satt";
  const weekday = (new Date(date + "T12:00:00Z").getUTCDay() + 6) % 7;
  const label = DAY_LABEL[DAYS[weekday]];
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} ${dayMonth(date)} kl. ${time}`;
}

/** Innlegget som bør vises først: det første som venter på godkjenning, ellers det første i uka. */
function firstToShow(posts: PostRow[]): PostRow | null {
  return posts.find((p) => p.status === "draft") ?? posts[0] ?? null;
}

export function WeekPlanner(props: {
  access: boolean;
  analysisStatus: string | null;
  weekOptions: WeekOption[];
  plans: Plan[];
  selectedWeek: string | null;
  today: string;
  initialPosts: PostRow[];
  assetUrls: Record<string, string>;
}) {
  const router = useRouter();
  const [posts, setPosts] = useState(props.initialPosts);
  // Nye innlegg fra serveren (etter «Lag innlegg») erstatter lista uten at siden må lastes på nytt.
  const [lastInitial, setLastInitial] = useState(props.initialPosts);
  if (props.initialPosts !== lastInitial) {
    setLastInitial(props.initialPosts);
    setPosts(props.initialPosts);
  }
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const dirty = useRef(false);
  const detail = useRef<HTMLElement>(null);
  const ready = props.access && Boolean(props.analysisStatus);

  const current = posts.find((p) => p.id === selectedId) ?? firstToShow(posts);

  const update = (post: PostRow) => setPosts((list) => list.map((p) => (p.id === post.id ? post : p)));
  const remove = (id: string) => {
    dirty.current = false;
    setPosts((list) => list.filter((p) => p.id !== id));
    setSelectedId(null);
  };

  function select(id: string) {
    if (id !== current?.id) {
      if (dirty.current && !window.confirm(UNSAVED)) return;
      dirty.current = false;
      setSelectedId(id);
    }
    // På mobil står detaljene under uka. Rull dit, så du ser innlegget du valgte.
    if (!window.matchMedia("(min-width: 64rem)").matches) {
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      requestAnimationFrame(() => detail.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" }));
    }
  }

  function leaveWeek(event: MouseEvent) {
    if (dirty.current && !window.confirm(UNSAVED)) event.preventDefault();
    else dirty.current = false;
  }

  const onGenerated = (week: string) => {
    setShowGenerator(false);
    router.push(`/uke?uke=${week}`);
    router.refresh();
  };

  const notices = !props.access ? (
    <Notice tone="info">Innholdsplanen krever et aktivt abonnement. <Link href="/abonnement" className="font-semibold underline">Start abonnementet</Link>.</Notice>
  ) : !props.analysisStatus ? (
    <Notice tone="info">Spyd skriver ut fra merkevareanalysen. <Link href="/merkevare" className="font-semibold underline">Lag analysen først</Link>.</Notice>
  ) : props.analysisStatus !== "approved" ? (
    <Notice tone="info">Merkevareanalysen er ikke godkjent ennå. Innleggene blir bedre når du har gått gjennom den. <Link href="/merkevare" className="font-semibold underline">Se analysen</Link>.</Notice>
  ) : null;

  const ordered = [...props.plans].sort((a, b) => a.start.localeCompare(b.start));
  const index = ordered.findIndex((p) => p.start === props.selectedWeek);
  const plan = index >= 0 ? ordered[index] : null;

  if (!props.selectedWeek || !plan) {
    return (
      <div className="flex flex-col gap-8">
        {notices}
        <section className="rounded-xl border border-line bg-paper p-5 sm:p-8" aria-labelledby="lag-tittel">
          <h2 id="lag-tittel" className="font-serif text-3xl tracking-[-0.01em]">Lag ukas innlegg</h2>
          <p className="mt-2 max-w-xl text-ink-soft">Velg uke, antall og kanaler. Spyd skriver innleggene og foreslår dag, klokkeslett og bilde.</p>
          <div className="mt-6"><Generator ready={ready} options={props.weekOptions} onDone={onGenerated} /></div>
        </section>
      </div>
    );
  }

  const prev = index > 0 ? ordered[index - 1] : null;
  const next = index < ordered.length - 1 ? ordered[index + 1] : null;
  const days = Array.from({ length: 7 }, (_, i) => addDays(plan.start, i));
  const byDate = new Map<string, PostRow[]>(days.map((d) => [d, []]));
  const loose: PostRow[] = [];
  for (const post of posts) {
    const date = post.scheduled_at ? osloParts(new Date(post.scheduled_at)).date : null;
    const list = date ? byDate.get(date) : undefined;
    if (list) list.push(post);
    else loose.push(post);
  }
  const counts = { draft: 0, approved: 0, published: 0 };
  for (const post of posts) counts[post.status]++;

  return (
    <div className="flex flex-col gap-6">
      {notices}

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <div className="flex items-center gap-1 sm:gap-3">
          <WeekArrow plan={prev} direction="prev" onNavigate={leaveWeek} />
          <div className="min-w-32 px-1 text-center sm:text-left">
            <h2 id="uke-tittel" className="text-xl font-semibold">Uke {plan.week}</h2>
            <p className="text-sm text-ink-soft">{plan.range}</p>
          </div>
          <WeekArrow plan={next} direction="next" onNavigate={leaveWeek} />
        </div>
        <p className="order-last w-full text-sm text-ink-soft sm:order-none sm:w-auto">
          {counts.draft} utkast · {counts.approved} godkjent · {counts.published} publisert
        </p>
        <button
          type="button"
          aria-expanded={showGenerator}
          aria-controls="lag-innlegg"
          onClick={() => setShowGenerator((value) => !value)}
          className={button.primary}
        >
          {showGenerator ? <CloseIcon className="size-5" /> : <PlusIcon className="size-5" />}
          {showGenerator ? "Lukk" : "Lag innlegg"}
        </button>
      </div>

      {showGenerator ? (
        <section id="lag-innlegg" aria-labelledby="lag-innlegg-tittel" className="rounded-xl border border-line bg-sand p-5 sm:p-6">
          <h2 id="lag-innlegg-tittel" className="font-serif text-2xl tracking-[-0.01em]">Lag nye innlegg</h2>
          <p className="mt-1 max-w-xl text-sm text-ink-soft">Utkast som ikke er godkjent i uka du velger, blir erstattet. Godkjente innlegg blir stående.</p>
          <div className="mt-5"><Generator ready={ready} options={props.weekOptions} onDone={onGenerated} replacing /></div>
        </section>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,23rem)] lg:items-start xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <ol aria-labelledby="uke-tittel" className="flex flex-col">
          {days.map((date, i) => (
            <DayRow
              key={date}
              label={SHORT_DAY[i]}
              sub={dayMonth(date)}
              isToday={date === props.today}
              posts={byDate.get(date) ?? []}
              current={current?.id ?? null}
              assetUrls={props.assetUrls}
              onSelect={select}
            />
          ))}
          {loose.length ? (
            <DayRow label="Uten dato" posts={loose} current={current?.id ?? null} assetUrls={props.assetUrls} onSelect={select} />
          ) : null}
        </ol>

        <aside ref={detail} id="innlegg-detaljer" aria-label="Valgt innlegg" className="scroll-mt-36 lg:sticky lg:top-8">
          {current ? (
            <PostDetail
              key={current.id}
              post={current}
              imageUrl={current.asset_id ? props.assetUrls[current.asset_id] : undefined}
              canUseAi={ready}
              dirtyRef={dirty}
              onChange={update}
              onDelete={remove}
            />
          ) : (
            <p className="rounded-xl bg-sand p-5 text-ink-soft">Ingen innlegg i denne uka. Lag nye med «Lag innlegg».</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function WeekArrow({ plan, direction, onNavigate }: { plan: Plan | null; direction: "prev" | "next"; onNavigate: (e: MouseEvent) => void }) {
  const Icon = direction === "prev" ? ChevronLeftIcon : ChevronRightIcon;
  const className = "flex size-11 items-center justify-center rounded-lg";
  if (!plan) {
    return (
      <span className={`${className} text-ink-soft/40`} aria-hidden="true">
        <Icon className="size-6" />
      </span>
    );
  }
  return (
    <Link
      href={`/uke?uke=${plan.start}`}
      onClick={onNavigate}
      className={`${className} text-terra-deep hover:bg-sand`}
      aria-label={`${direction === "prev" ? "Forrige" : "Neste"} uke med innlegg: uke ${plan.week}, ${plan.range}`}
    >
      <Icon className="size-6" />
    </Link>
  );
}

function DayRow({ label, sub, isToday = false, posts, current, assetUrls, onSelect }: {
  label: string; sub?: string; isToday?: boolean; posts: PostRow[]; current: string | null;
  assetUrls: Record<string, string>; onSelect: (id: string) => void;
}) {
  return (
    <li className="grid grid-cols-[3.75rem_minmax(0,1fr)] gap-3 border-b border-line py-4 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-5">
      <div className="pt-1">
        <p className="font-serif text-xl leading-tight">{label}</p>
        {sub ? <p className="mt-0.5 text-sm text-ink-soft">{sub}</p> : null}
        {isToday ? <p className="mt-1 text-xs font-semibold text-terra-deep">I dag</p> : null}
      </div>
      {posts.length ? (
        <ul className="flex flex-col gap-3">
          {posts.map((post) => (
            <li key={post.id}>
              <PostButton
                post={post}
                imageUrl={post.asset_id ? assetUrls[post.asset_id] : undefined}
                selected={post.id === current}
                onSelect={() => onSelect(post.id)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="self-center text-ink-soft">Ingen planlagt publisering</p>
      )}
    </li>
  );
}

const STATUS_CHIP: Record<PostRow["status"], { label: string; className: string }> = {
  draft: { label: "Utkast", className: "bg-sand text-ink" },
  approved: { label: "Godkjent", className: "bg-ok/10 text-ok" },
  published: { label: "Publisert", className: "bg-ink text-paper" },
};

function PostButton({ post, imageUrl, selected, onSelect }: { post: PostRow; imageUrl?: string; selected: boolean; onSelect: () => void }) {
  const Icon = PLATFORM_ICON[post.platform];
  const time = post.scheduled_at ? osloParts(new Date(post.scheduled_at)).time : null;
  const chip = STATUS_CHIP[post.status];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      aria-controls="innlegg-detaljer"
      className={
        "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors sm:gap-4 " +
        (selected ? "border-terra bg-terra/[0.07]" : "border-line bg-paper hover:border-edge")
      }
    >
      <Thumbnail imageUrl={imageUrl} platform={post.platform} className="h-16 w-20 rounded-lg sm:h-[4.5rem] sm:w-24" />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 font-serif text-lg leading-snug sm:text-xl">{post.topic || post.base_text.slice(0, 80) || "Innlegg"}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-ink-soft">
          <span className="flex items-center gap-1.5"><Icon className="size-4" />{PLATFORM_LABEL[post.platform]}</span>
          {time ? <span>kl. {time}</span> : null}
          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${chip.className}`}>{chip.label}</span>
        </span>
      </span>
      <ChevronRightIcon className="size-5 shrink-0 text-ink-soft" />
    </button>
  );
}

function Thumbnail({ imageUrl, platform, className }: { imageUrl?: string; platform: Platform; className: string }) {
  const Icon = PLATFORM_ICON[platform];
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- signert, privat adresse fra biblioteket
    return <img src={imageUrl} alt="" className={`shrink-0 object-cover ${className}`} />;
  }
  return (
    <span className={`flex shrink-0 items-center justify-center bg-sand text-ink-soft ${className}`}>
      <Icon className="size-6" />
    </span>
  );
}

function Generator({ ready, options, onDone, replacing = false }: { ready: boolean; options: WeekOption[]; onDone: (week: string) => void; replacing?: boolean }) {
  const [week, setWeek] = useState<"this" | "next">("next");
  const [count, setCount] = useState(3);
  const [platforms, setPlatforms] = useState<Platform[]>([...PLATFORMS]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const chosen = options.find((o) => o.value === week);
  const selectClass = "rounded-lg border border-edge bg-white/60 px-3 py-2.5";

  async function generate() {
    if (replacing && !window.confirm("Utkast som ikke er godkjent i den valgte uka, blir erstattet. Godkjente innlegg blir stående. Fortsette?")) return;
    setBusy(true);
    setMessage({ tone: "info", text: "Spyd skriver innleggene. Det tar som regel under ett minutt." });
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
          <select value={week} onChange={(e) => setWeek(e.target.value as "this" | "next")} className={selectClass}>
            {options.map((o) => <option key={o.value} value={o.value} disabled={!o.days}>{o.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Antall innlegg</span>
          <select value={count} onChange={(e) => setCount(Number(e.target.value))} className={selectClass}>
            {[3, 5, 7].map((n) => <option key={n} value={n}>{n} innlegg</option>)}
          </select>
        </label>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold">Kanaler</legend>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => {
            const Icon = PLATFORM_ICON[p];
            const on = platforms.includes(p);
            return (
              <label key={p} className={"flex cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-ink " + (on ? "border-terra-deep bg-paper" : "border-edge")}>
                <input type="checkbox" className="accent-terra-deep" checked={on} onChange={(e) => setPlatforms((c) => (e.target.checked ? [...c, p] : c.filter((x) => x !== p)))} />
                <Icon className="size-4" />
                {PLATFORM_LABEL[p]}
              </label>
            );
          })}
        </div>
      </fieldset>
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      <div>
        <button type="submit" disabled={busy || !ready || !platforms.length || !chosen?.days} className={button.primary}>
          {busy ? "Skriver …" : "Lag ukas innlegg"}
        </button>
      </div>
    </form>
  );
}

function StatusBadge({ post }: { post: PostRow }) {
  const published = post.status === "published" && post.published_at
    ? ` ${new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "long" }).format(new Date(post.published_at))}`
    : "";
  const label = post.status === "draft" ? "Klar til godkjenning" : post.status === "approved" ? "Godkjent, klar til publisering" : `Publisert${published}`;
  return (
    <p className={"inline-flex items-center gap-2 self-start rounded-lg px-3 py-1.5 text-sm font-semibold " + (post.status === "approved" ? "bg-ok/10 text-ok" : "bg-sand text-ink")}>
      <CheckCircleIcon className="size-5" />
      {label}
    </p>
  );
}

function Preview({ platform, imageUrl, imageIdea, text, hashtags }: {
  platform: Platform; imageUrl?: string; imageIdea: string | null; text: string; hashtags: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = PLATFORM_ICON[platform];
  const tags = hashtags.split(/[\s,]+/).filter(Boolean).map((t) => (t.startsWith("#") ? t : `#${t}`));
  const long = text.length > 320;
  return (
    <figure className="overflow-hidden rounded-xl border border-line bg-white/50">
      <figcaption className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
        <span className="flex items-center gap-2 font-semibold"><Icon className="size-5" />{PLATFORM_LABEL[platform]}</span>
        <span className="text-ink-soft">Forhåndsvisning</span>
      </figcaption>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- signert, privat adresse fra biblioteket
        <img src={imageUrl} alt={imageIdea ?? "Bilde fra biblioteket"} className="aspect-[4/3] w-full object-cover" />
      ) : (
        <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 bg-sand p-6 text-center text-sm text-ink-soft">
          <span className="font-semibold text-ink">Ingen bilde valgt</span>
          {imageIdea ? <span>Bildeforslag: {imageIdea}</span> : null}
        </div>
      )}
      <div className="px-4 py-4">
        <p className={"whitespace-pre-line leading-relaxed " + (long && !expanded ? "line-clamp-6" : "")}>{text || "Teksten er tom."}</p>
        {long ? (
          <button type="button" onClick={() => setExpanded((v) => !v)} className={`${link} mt-2 text-sm`}>
            {expanded ? "Vis mindre" : "Vis hele teksten"}
          </button>
        ) : null}
        {tags.length ? <p className="mt-3 text-sm leading-relaxed text-terra-deep">{tags.join(" ")}</p> : null}
      </div>
    </figure>
  );
}

function PostDetail({ post, imageUrl, canUseAi, dirtyRef, onChange, onDelete }: {
  post: PostRow; imageUrl?: string; canUseAi: boolean; dirtyRef: RefObject<boolean>;
  onChange: (post: PostRow) => void; onDelete: (id: string) => void;
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
  const id = useId();

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
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty, dirtyRef]);

  const limit = LIMIT[post.platform];
  const Icon = PLATFORM_ICON[post.platform];
  const editable = post.status !== "published";

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

  const fieldClass = "w-full rounded-lg border border-edge bg-white/60 px-3 py-2";

  return (
    <article aria-labelledby={`${id}-tittel`} className="flex flex-col gap-5 rounded-xl border border-line bg-paper p-5 sm:p-6">
      <header className="flex flex-col gap-3">
        <h2 id={`${id}-tittel`} className="font-serif text-3xl leading-tight tracking-[-0.01em]">{post.topic || "Innlegg"}</h2>
        <StatusBadge post={post} />
      </header>

      <Preview platform={post.platform} imageUrl={imageUrl} imageIdea={post.image_idea} text={text} hashtags={hashtags} />

      <dl className="divide-y divide-line border-y border-line text-sm">
        <div className="flex items-center gap-3 py-3">
          <CalendarIcon className="size-5 shrink-0 text-ink-soft" />
          <dt className="w-24 shrink-0 text-ink-soft">{post.status === "published" ? "Planlagt" : "Publiseres"}</dt>
          <dd className="font-semibold">{longWhen(date, time)}</dd>
        </div>
        <div className="flex items-center gap-3 py-3">
          <Icon className="size-5 shrink-0 text-ink-soft" />
          <dt className="w-24 shrink-0 text-ink-soft">Kanal</dt>
          <dd className="font-semibold">{PLATFORM_LABEL[post.platform]}</dd>
        </div>
      </dl>

      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      <div className="flex flex-col gap-2">
        {post.status === "draft" ? (
          <button type="button" disabled={pending || text.length > limit} onClick={approve} className={`${button.primary} w-full`}>
            <CheckIcon className="size-5" />
            {dirty ? "Lagre og godkjenn" : "Godkjenn innlegg"}
          </button>
        ) : null}
        {post.status === "approved" ? (
          <>
            <button type="button" onClick={() => void copy()} className={`${button.primary} w-full`}>Kopier tekst</button>
            <button type="button" disabled={pending} onClick={() => act(() => setPostStatus(post.id, "published"), "Merket som publisert.")} className={`${button.secondary} w-full`}>Jeg har publisert</button>
            <button type="button" disabled={pending} onClick={() => act(() => setPostStatus(post.id, "draft"))} className="self-center px-2 py-1 text-sm font-semibold text-ink-soft underline underline-offset-4">Angre godkjenning</button>
          </>
        ) : null}
        {post.status === "published" ? (
          <button type="button" onClick={() => void copy()} className={`${button.secondary} w-full`}>Kopier tekst</button>
        ) : null}
      </div>

      {editable ? (
        <details className="group rounded-xl border border-line" open={dirty || undefined}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
            Rediger innlegget
            <ChevronRightIcon className="size-5 text-ink-soft transition-transform group-open:rotate-90" />
          </summary>
          <div className="flex flex-col gap-4 border-t border-line p-4">
            <label className="flex flex-col gap-1.5" htmlFor={`${id}-tekst`}>
              <span className="text-sm font-semibold">Tekst</span>
              <textarea id={`${id}-tekst`} value={text} onChange={(e) => setText(e.target.value)} className={`${fieldClass} min-h-40 resize-y py-3 leading-relaxed [field-sizing:content]`} />
              <span className={"text-xs " + (text.length > limit ? "font-semibold text-terra-deep" : "text-ink-soft")}>{text.length} av maks {limit} tegn</span>
            </label>
            <label className="flex flex-col gap-1.5" htmlFor={`${id}-knagger`}>
              <span className="text-sm font-semibold">Emneknagger</span>
              <input id={`${id}-knagger`} value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="#ingen" className={`${fieldClass} text-sm`} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-sm" htmlFor={`${id}-dato`}>
                <span className="font-semibold">Dato</span>
                <input id={`${id}-dato`} type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm" htmlFor={`${id}-tid`}>
                <span className="font-semibold">Klokkeslett</span>
                <input id={`${id}-tid`} type="time" value={time} onChange={(e) => setTime(e.target.value)} className={fieldClass} />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {dirty ? (
                <button type="button" disabled={pending} onClick={() => act(save, "Endringene er lagret.")} className={button.secondarySmall}>Lagre endringer</button>
              ) : null}
              {post.status === "draft" ? (
                <button type="button" disabled={pending || !canUseAi} onClick={() => setShowRewrite((v) => !v)} className={button.quietSmall} aria-expanded={showRewrite}>Skriv om med AI</button>
              ) : null}
            </div>
            {showRewrite && post.status === "draft" ? (
              <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); act(() => rewritePost(post.id, instruction), "Skrevet om. Se over og godkjenn."); setShowRewrite(false); setInstruction(""); }}>
                <label htmlFor={`${id}-onske`} className="sr-only">Hva skal endres?</label>
                <input id={`${id}-onske`} value={instruction} onChange={(e) => setInstruction(e.target.value)} maxLength={300} placeholder="For eksempel: kortere, mer humor, nevn lunsj" className={`${fieldClass} min-w-0 flex-1 text-sm`} />
                <button type="submit" disabled={pending} className={button.primarySmall}>{pending ? "Skriver …" : "Skriv om"}</button>
              </form>
            ) : null}
          </div>
        </details>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        {pending ? <p className="text-sm text-ink-soft" role="status">Jobber …</p> : <span />}
        <button
          type="button"
          disabled={pending}
          onClick={() => { if (window.confirm("Slette innlegget?")) act(async () => { const r = await deletePost(post.id); if (r.ok) onDelete(post.id); return r; }); }}
          className="px-2 py-1 text-sm font-semibold text-terra-deep underline underline-offset-4"
        >
          Slett innlegget
        </button>
      </div>
    </article>
  );
}
