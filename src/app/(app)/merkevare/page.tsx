import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/loading";
import { Notice } from "@/components/notice";
import { loadBrandAnalysis } from "@/lib/ai/brand-analysis-cache";
import { requireOrg } from "@/lib/auth";
import { BrandAnalysisEditor } from "./brand-analysis-editor";

export const metadata: Metadata = { title: "Merkevareanalyse" };

export default function BrandAnalysisPage() {
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Merkevareanalyse</h1>
        <p className="max-w-2xl text-ink-soft">
          Det Spott vet om bedriften: målgrupper, tone, budskap og muligheter. Rett det som ikke stemmer, og godkjenn.
        </p>
      </header>
      <Suspense fallback={<Loading />}>
        <BrandAnalysisData />
      </Suspense>
    </>
  );
}

async function BrandAnalysisData() {
  const { supabase, org } = await requireOrg();
  const { data: profile } = await supabase.from("brand_profiles")
    .select("website_url,tone,audience,products,avoid,language").eq("org_id", org.id).maybeSingle();
  let stored;
  try {
    stored = await loadBrandAnalysis(supabase, org, profile);
  } catch {
    return <Notice tone="error">Kunne ikke hente analysen. Last siden på nytt.</Notice>;
  }
  return (
    <BrandAnalysisEditor
      initialAnalysis={stored.analysis}
      initialStatus={stored.status}
      analyzedAt={stored.analyzedAt}
      approvedAt={stored.approvedAt}
      websiteUrl={stored.websiteUrl}
      profileWebsite={profile?.website_url ?? null}
      sourcePages={stored.sourcePages}
      model={stored.model}
      stale={stored.stale}
      organizationName={org.name}
    />
  );
}
