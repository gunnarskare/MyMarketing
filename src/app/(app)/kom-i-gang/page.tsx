import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/loading";
import { requireOrg } from "@/lib/auth";
import type { BrandProfile } from "@/lib/brand-profile";
import { BrandAssistant } from "./brand-assistant";

export const metadata: Metadata = { title: "Kom i gang" };

export default function StartPage() {
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Kom i gang</h1>
        <p className="max-w-2xl text-ink-soft">Fem korte spørsmål om bedriften. Svarene lagres i profilen, og du kan endre dem når som helst.</p>
      </header>
      <Suspense fallback={<Loading />}>
        <StartContent />
      </Suspense>
    </>
  );
}

async function StartContent() {
  const { supabase, org } = await requireOrg();
  const [{ data: profile }, { data: assets }, { data: typography }] = await Promise.all([
    supabase.from("brand_profiles").select("website_url,tone,audience,products,avoid,language").eq("org_id", org.id).maybeSingle<BrandProfile>(),
    supabase.from("brand_assets").select("id,kind,original_name").eq("org_id", org.id),
    supabase.from("brand_typography").select("org_id").eq("org_id", org.id).maybeSingle(),
  ]);
  return <BrandAssistant orgName={org.name} profile={profile ?? null} assets={assets ?? []} hasTypography={Boolean(typography)} />;
}
