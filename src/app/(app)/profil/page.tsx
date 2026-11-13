import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/loading";
import { requireOrg } from "@/lib/auth";
import type { BrandProfile } from "@/lib/brand-profile";
import { ProfileForm } from "./profile-form";
import { BrandLibrary } from "./brand-library";
import { TypographyEditor } from "./typography-editor";
import { BrandWebsiteImporter } from "./brand-website-importer";

export const metadata: Metadata = { title: "Merkevareprofil" };

export default function ProfilePage() {
  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight">Merkevareprofil</h1>
        <p className="text-ink-soft">Dette er det AI-en skriver ut fra. Jo mer presist du fyller ut, jo bedre blir utkastene.</p>
      </header>
      <Suspense fallback={<Loading />}><SavedProfile /></Suspense>
    </>
  );
}

async function SavedProfile() {
  const { supabase, org } = await requireOrg();
  const { data } = await supabase.from("brand_profiles")
    .select("website_url, tone, audience, products, avoid, language")
    .eq("org_id", org.id).maybeSingle<BrandProfile>();
  return <><ProfileForm profile={data ?? null} /><BrandWebsiteImporter /><TypographyEditor orgId={org.id} /><BrandLibrary orgId={org.id} /></>;
}
