import type { Metadata } from "next";
import Link from "next/link";
import { requireOrg } from "@/lib/auth";
import { BrandAnalysisEditor } from "./brand-analysis-editor";

export const metadata: Metadata = { title: "Merkevaregrunnmur" };

export default async function BrandAnalysisPage() {
  const { supabase, org } = await requireOrg();
  const { data, error } = await supabase.from("brand_analyses")
    .select("analysis,status,analyzed_at,website_url,source_pages,model,approved_at")
    .eq("org_id", org.id).maybeSingle();
  return (
    <>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-spot uppercase">SPOTTS KUNNSKAPSGRUNNLAG</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">Merkevaregrunnmur<span className="text-spot">.</span></h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-soft">Her kan du kontrollere og forme kunnskapen Spott bruker når den lager innhold og markedsføring for bedriften.</p>
        </div>
        <Link href="/profil" className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-5 text-sm font-semibold hover:bg-mist">Rediger profil</Link>
      </header>
      {error ? <div className="rounded-xl border border-spot/30 bg-spot/5 p-4 text-sm">Kunne ikke hente merkevareanalysen. Last siden på nytt.</div> :
        <BrandAnalysisEditor initialAnalysis={data?.analysis ?? null} initialStatus={data?.status ?? "not_created"} analyzedAt={data?.analyzed_at ?? null} websiteUrl={data?.website_url ?? null} sourcePages={data?.source_pages ?? []} model={data?.model ?? null} approvedAt={data?.approved_at ?? null} organizationName={org.name} />}
    </>
  );
}
