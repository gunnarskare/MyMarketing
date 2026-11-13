import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Loading } from "@/components/loading";
import { requireOrg } from "@/lib/auth";
import type { BrandProfile } from "@/lib/brand-profile";
import { BrandAssistant } from "./brand-assistant";
export const metadata: Metadata = { title: "Kom i gang med Spott" };
export default function StartPage() { return <Suspense fallback={<Loading />}><StartContent /></Suspense>; }
async function StartContent() {
 const { supabase, org } = await requireOrg();
 const [{ data: profile }, { data: assets }] = await Promise.all([
  supabase.from("brand_profiles").select("website_url,tone,audience,products,avoid,language").eq("org_id",org.id).maybeSingle<BrandProfile>(),
  supabase.from("brand_assets").select("id,kind,original_name").eq("org_id",org.id),
 ]);
 return <><header className="flex flex-col gap-2"><Link href="/dashboard" className="text-sm font-semibold text-ink-soft underline underline-offset-4">← Til oversikten</Link><p className="mt-3 text-xs font-bold tracking-[0.18em] text-spot uppercase">SPOTT MERKEVAREASSISTENT</p><h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">La oss gjøre bedriften klar for Spott.</h1><p className="max-w-2xl text-ink-soft">Svar på noen enkle spørsmål. Assistenten hjelper deg å finne ut hva som mangler, og hva Spott kan hjelpe deg med å lage.</p></header><BrandAssistant orgName={org.name} profile={profile ?? null} assets={assets ?? []} /></>;
}
