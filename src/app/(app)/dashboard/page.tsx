import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Loading } from "@/components/loading";
import { Notice } from "@/components/notice";
import { loadBrandAnalysis } from "@/lib/ai/brand-analysis-cache";
import { requireOrg } from "@/lib/auth";

export const metadata: Metadata = { title: "Oversikt" };

type Post = { id: string; topic: string | null; status: "draft" | "approved" | "scheduled" | "published" | "failed"; scheduled_at: string | null; created_at: string };
const POST_STATUS: Record<Post["status"], string> = { draft: "Utkast", approved: "Godkjent", scheduled: "Planlagt", published: "Publisert", failed: "Feilet" };
const ACCOUNT_STATUS: Record<string, { label: string; ok: boolean }> = {
  active: { label: "Tilkoblet", ok: true }, expired: { label: "Utløpt", ok: false }, revoked: { label: "Frakoblet", ok: false },
};

type Step = { title: string; detail: string; done: boolean; href?: string; action?: string };

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const { supabase, org } = await requireOrg();
  const countPosts = (status: Post["status"]) =>
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("org_id", org.id).eq("status", status);
  const [profileResult, assetsResult, typographyResult, postsResult, draftCount, scheduledCount, publishedCount, accountsResult] = await Promise.all([
    supabase.from("brand_profiles").select("website_url,tone,audience,products,avoid,language").eq("org_id", org.id).maybeSingle(),
    supabase.from("brand_assets").select("kind,is_primary").eq("org_id", org.id),
    supabase.from("brand_typography").select("org_id").eq("org_id", org.id).maybeSingle(),
    supabase.from("posts").select("id,topic,status,scheduled_at,created_at").eq("org_id", org.id).order("created_at", { ascending: false }).limit(5),
    countPosts("draft"),
    countPosts("scheduled"),
    countPosts("published"),
    supabase.from("social_accounts").select("id,platform,name,status").eq("org_id", org.id).order("created_at", { ascending: true }),
  ]);
  const profile = profileResult.data;
  const analysis = await loadBrandAnalysis(supabase, org, profile).catch(() => null);
  const assets = assetsResult.data ?? [];
  const posts = (postsResult.data ?? []) as Post[];
  const counts: Record<string, number> = { draft: draftCount.count ?? 0, scheduled: scheduledCount.count ?? 0, published: publishedCount.count ?? 0 };
  const accounts = accountsResult.data ?? [];
  const failed = [profileResult, assetsResult, typographyResult, postsResult, draftCount, scheduledCount, publishedCount, accountsResult].some((r) => r.error) || !analysis;

  const profileFields = [profile?.website_url, profile?.products, profile?.audience, profile?.tone].filter(Boolean).length;
  const logos = assets.filter((a) => a.kind === "logo");
  const images = assets.filter((a) => a.kind === "image").length;

  const analysisStep: Step = !analysis || analysis.status === "not_created"
    ? { title: "Lag merkevareanalysen", detail: profile?.website_url ? "Spott leser nettsiden og beskriver merkevaren." : "Krever at nettsiden er lagt inn i profilen.", done: false, href: "/merkevare", action: "Lag analysen" }
    : analysis.stale
      ? { title: "Oppdater merkevareanalysen", detail: "Profilen er endret etter at analysen ble laget.", done: false, href: "/merkevare", action: "Se analysen" }
      : analysis.status === "approved"
        ? { title: "Merkevareanalysen er godkjent", detail: "Spott bruker den når innhold lages.", done: true, href: "/merkevare" }
        : { title: "Gå gjennom merkevareanalysen", detail: "Rett det som ikke stemmer, og godkjenn.", done: false, href: "/merkevare", action: "Gå gjennom" };

  const steps: Step[] = [
    profileFields === 4
      ? { title: "Profilen er fylt ut", detail: "Nettside, tilbud, målgruppe og tone.", done: true, href: "/profil#om-bedriften" }
      : { title: "Fyll ut profilen", detail: `${profileFields} av 4 viktige felt er fylt ut.`, done: false, href: "/profil#om-bedriften", action: "Fyll ut" },
    analysisStep,
    logos.some((l) => l.is_primary)
      ? { title: "Hovedlogoen er valgt", detail: "Den brukes på grafikk og innlegg.", done: true, href: "/profil#bibliotek" }
      : logos.length
        ? { title: "Velg hovedlogo", detail: `${logos.length} ${logos.length === 1 ? "logo" : "logoer"} lastet opp, men ingen er valgt som hovedlogo.`, done: false, href: "/profil#bibliotek", action: "Velg" }
        : { title: "Last opp logoen", detail: "Eller hent den fra nettsiden.", done: false, href: "/profil#hent-fra-nettside", action: "Last opp" },
    images >= 3
      ? { title: `${images} bilder i biblioteket`, detail: "Spott velger blant dem til innleggene.", done: true, href: "/profil#bibliotek" }
      : { title: "Legg inn noen bilder", detail: images ? `${images} av minst 3 bilder.` : "Bilder fra bedriften gjør innleggene bedre.", done: false, href: "/profil#bibliotek", action: "Legg inn" },
    typographyResult.data
      ? { title: "Typografien er valgt", detail: "Fontene som brukes i grafikk.", done: true, href: "/profil#typografi" }
      : { title: "Velg typografi", detail: "Hvilke fonter grafikken skal bruke.", done: false, href: "/profil#typografi", action: "Velg" },
  ];
  const done = steps.filter((s) => s.done).length;

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
          Hei, {org.name}<span aria-hidden="true" className="ml-[0.05em] inline-block size-[0.2em] rounded-full bg-spot" />
        </h1>
        <p className="max-w-xl text-lg text-ink-soft">
          {done === steps.length ? "Alt er klart for ukeplanen." : `${done} av ${steps.length} steg er gjort før Spott kan lage ukas innlegg.`}
        </p>
      </header>

      {failed ? <Notice tone="error">Noe av oversikten kunne ikke hentes. Last siden på nytt.</Notice> : null}

      <section aria-labelledby="neste-steg" className="flex flex-col gap-4">
        <h2 id="neste-steg" className="text-2xl font-bold tracking-tight">Gjør Spott klar</h2>
        <div className="h-2 overflow-hidden rounded-full bg-mist" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done} aria-label="Fremdrift">
          <div className="h-full rounded-full bg-spot" style={{ width: `${(done / steps.length) * 100}%` }} />
        </div>
        <ol className="divide-y divide-line rounded-2xl border border-line">
          {steps.map((step) => (
            <li key={step.title} className="flex items-center gap-4 p-4 sm:p-5">
              <span aria-hidden="true" className={"flex size-6 shrink-0 items-center justify-center rounded-full " + (step.done ? "bg-spot" : "border-2 border-ink-muted")}>
                {step.done ? <span className="size-2 rounded-full bg-paper" /> : null}
              </span>
              <div className="min-w-0 flex-1">
                <p className={"font-semibold " + (step.done ? "text-ink-soft" : "")}>
                  <span className="sr-only">{step.done ? "Ferdig: " : "Gjenstår: "}</span>{step.title}
                </p>
                <p className="text-sm text-ink-soft">{step.detail}</p>
              </div>
              {step.href && step.action ? (
                <Link href={step.href} className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper">{step.action}</Link>
              ) : step.href ? (
                <Link href={step.href} className="shrink-0 text-sm font-semibold underline underline-offset-4">Se</Link>
              ) : null}
            </li>
          ))}
          <li className="flex items-center gap-4 p-4 sm:p-5">
            <span aria-hidden="true" className="size-6 shrink-0 rounded-full border-2 border-dashed border-ink-muted" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink-soft">Koble til Facebook, Instagram og LinkedIn</p>
              <p className="text-sm text-ink-soft">Kommer. Til da kan du kopiere innleggene og publisere selv.</p>
            </div>
          </li>
        </ol>
        <p className="text-sm text-ink-soft">
          Vil du heller svare på noen spørsmål? <Link href="/kom-i-gang" className="font-semibold underline underline-offset-4">Bruk veiviseren</Link>.
        </p>
      </section>

      <section aria-labelledby="innlegg" className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <h2 id="innlegg" className="text-2xl font-bold tracking-tight">Innlegg</h2>
          <dl className="grid grid-cols-3 gap-3">
            {(["draft", "scheduled", "published"] as const).map((status) => (
              <div key={status} className="rounded-2xl border border-line p-4">
                <dt className="text-sm text-ink-soft">{POST_STATUS[status]}</dt>
                <dd className="mt-1 text-3xl font-extrabold tabular-nums">{counts[status] ?? 0}</dd>
              </div>
            ))}
          </dl>
          {posts.length ? (
            <ul className="divide-y divide-line rounded-2xl border border-line">
              {posts.map((post) => (
                <li key={post.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{post.topic || "Innlegg uten tittel"}</p>
                    <p className="text-sm text-ink-soft">
                      {post.scheduled_at ? `Planlagt ${formatDate(post.scheduled_at)}` : `Laget ${formatDate(post.created_at)}`}
                    </p>
                  </div>
                  <span className={"shrink-0 rounded-full px-3 py-1 text-xs font-semibold " + (post.status === "failed" ? "bg-spot/10 text-spot" : "bg-mist")}>{POST_STATUS[post.status]}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl bg-mist p-5 text-ink-soft">Ingen innlegg ennå. Når profilen og analysen er klare, lager Spott ukas utkast her.</p>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold tracking-tight">Kanaler</h2>
          {accounts.length ? (
            <ul className="divide-y divide-line rounded-2xl border border-line">
              {accounts.map((account) => {
                const status = ACCOUNT_STATUS[account.status] ?? { label: account.status, ok: false };
                return (
                  <li key={account.id} className="flex items-center justify-between gap-3 p-4">
                    <span className="font-semibold capitalize">{account.platform}</span>
                    <span className={"text-sm font-semibold " + (status.ok ? "text-ok" : "text-spot")}>{status.label}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-2xl bg-mist p-5 text-ink-soft">Ingen kanaler er koblet til. Tilkobling til Facebook, Instagram og LinkedIn kommer.</p>
          )}
        </div>
      </section>
    </>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short" }).format(new Date(value));
}
