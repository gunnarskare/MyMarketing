import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Loading } from "@/components/loading";
import { requireOrg } from "@/lib/auth";

export const metadata: Metadata = { title: "Oversikt" };
type Post = { id: string; topic: string | null; status: "draft" | "approved" | "scheduled" | "published" | "failed"; scheduled_at: string | null; created_at: string };
const STATUS: Record<Post["status"], { label: string; className: string }> = {
  draft: { label: "Utkast", className: "bg-mist text-ink-soft" },
  approved: { label: "Godkjent", className: "bg-emerald-50 text-emerald-800" },
  scheduled: { label: "Planlagt", className: "bg-orange-50 text-orange-800" },
  published: { label: "Publisert", className: "bg-emerald-50 text-emerald-800" },
  failed: { label: "Feilet", className: "bg-red-50 text-red-800" },
};

export default function DashboardPage() {
  return <Suspense fallback={<Loading />}><DashboardContent /></Suspense>;
}

async function DashboardContent() {
  const { supabase, org } = await requireOrg();
  const [drafts, scheduled, published, recentResult, accountsResult] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("org_id", org.id).eq("status", "draft"),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("org_id", org.id).eq("status", "scheduled"),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("org_id", org.id).eq("status", "published"),
    supabase.from("posts").select("id, topic, status, scheduled_at, created_at").eq("org_id", org.id).order("created_at", { ascending: false }).limit(6),
    supabase.from("social_accounts").select("id, platform, name, status").eq("org_id", org.id).order("created_at", { ascending: true }),
  ]);
  const recent = (recentResult.data ?? []) as Post[];
  const accounts = accountsResult.data ?? [];
  const error = Boolean(drafts.error || scheduled.error || published.error || recentResult.error || accountsResult.error);
  return (
    <>
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold tracking-[0.18em] text-spot-dark uppercase">BEDRIFTSOVERSIKT</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">Hei, {org.name}<span className="font-editorial text-spot">.</span></h1><p className="mt-3 max-w-xl text-base leading-relaxed text-ink-soft">Her får du oversikt over innholdet og markedsføringen til bedriften.</p></div>
        <Link href="/profil" className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-paper transition-colors hover:bg-[#172747]">Rediger merkevareprofil <span aria-hidden className="ml-2 text-spot">↗</span></Link>
      </section>
      {error ? <p role="status" className="rounded-xl border border-spot/40 bg-spot/10 px-4 py-3 text-sm">Noe av oversikten kunne ikke lastes. Prøv å laste siden på nytt.</p> : null}
      <section aria-label="Nøkkeltall" className="grid gap-4 sm:grid-cols-3">
        <Metric label="Utkast" value={drafts.count ?? 0} note="Innlegg som venter på gjennomgang" />
        <Metric label="Planlagt" value={scheduled.count ?? 0} note="Innlegg satt opp for publisering" />
        <Metric label="Publisert" value={published.count ?? 0} note="Innlegg som er publisert" />
      </section>
      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
        <div className="rounded-3xl border border-line bg-white p-5 shadow-[0_24px_60px_-48px_rgb(10_20_40/45%)] sm:p-7">
          <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold tracking-[0.16em] text-spot-dark uppercase">INNHOLD</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Siste innlegg</h2></div><span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-ink-soft">Siste 6</span></div>
          {recent.length ? <ul className="mt-5 divide-y divide-line">{recent.map((post) => { const status = STATUS[post.status] ?? STATUS.draft; return <li key={post.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate font-semibold">{post.topic || "Innlegg uten tittel"}</p><p className="mt-1 text-xs text-ink-soft">Opprettet {formatDate(post.created_at)}{post.scheduled_at ? ` · Planlagt ${formatDate(post.scheduled_at)}` : ""}</p></div><span className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span></li>; })}</ul> : <div className="mt-6 rounded-2xl bg-paper px-5 py-8 text-center"><span aria-hidden className="mx-auto flex size-12 items-center justify-center rounded-full bg-spot/10 text-2xl text-spot">✳</span><h3 className="mt-4 text-lg font-semibold">Her kommer innleggene dine</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">Når Spott begynner å lage innholdsutkast for bedriften, finner du dem samlet her.</p><p className="mt-4 text-sm font-semibold"><Link href="/profil" className="underline decoration-2 underline-offset-4">Start med merkevareprofilen</Link></p></div>}
        </div>
        <aside className="flex flex-col gap-6">
          <div className="rounded-3xl bg-ink p-6 text-paper sm:p-7"><p className="text-xs font-bold tracking-[0.16em] text-spot uppercase">KOM I GANG</p><h2 className="mt-3 text-2xl font-semibold tracking-tight">Gjør Spott kjent med bedriften</h2><p className="mt-3 text-sm leading-relaxed text-ink-muted">En god merkevareprofil gir Spott grunnlaget for å skrive med riktig tone, til riktig målgruppe.</p><Link href="/profil" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-paper px-5 text-sm font-semibold text-ink hover:bg-white">Fullfør profilen <span aria-hidden className="ml-2 text-spot">↗</span></Link></div>
          <div className="rounded-3xl border border-line bg-white p-6 sm:p-7"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Sosiale kanaler</h2><span className="text-xs text-ink-soft">{accounts.length} tilkoblet</span></div>
            {accounts.length ? <ul className="mt-4 divide-y divide-line">{accounts.map((account) => <li key={account.id} className="flex items-center justify-between gap-3 py-3"><span className="font-medium capitalize">{account.platform}</span><span className="text-xs font-semibold text-ok">{account.status === "active" ? "Tilkoblet" : account.status === "expired" ? "Utløpt" : "Frakoblet"}</span></li>)}</ul> : <p className="mt-3 text-sm leading-relaxed text-ink-soft">Ingen kanaler er koblet til ennå. Tilkobling av Facebook, Instagram og LinkedIn kommer i en senere versjon.</p>}
          </div>
        </aside>
      </section>
      <p className="text-xs leading-relaxed text-ink-soft">Spott er under utvikling. Oversikten viser data som allerede finnes på bedriftskontoen; automatisk innholdsproduksjon og publisering er ikke aktivert ennå.</p>
    </>
  );
}
function Metric({ label, value, note }: { label: string; value: number; note: string }) {
  return <div className="rounded-2xl border border-line bg-white p-5 shadow-[0_18px_45px_-42px_rgb(10_20_40/45%)]"><p className="text-sm font-semibold text-ink-soft">{label}</p><p className="mt-3 text-4xl font-semibold tracking-[-0.06em] tabular-nums">{value}</p><p className="mt-2 text-xs leading-relaxed text-ink-soft">{note}</p></div>;
}
function formatDate(value: string) { return new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short" }).format(new Date(value)); }
