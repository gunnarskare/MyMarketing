import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/loading";
import { requireOrg } from "@/lib/auth";
import type { BrandProfile } from "@/lib/brand-profile";
import { BrandLibrary } from "./brand-library";
import { BrandWebsiteImporter } from "./brand-website-importer";
import { ProfileForm } from "./profile-form";
import { TypographyEditor } from "./typography-editor";

export const metadata: Metadata = { title: "Merkevareprofil" };

const SECTIONS = [
  ["#om-bedriften", "Om bedriften"],
  ["#hent-fra-nettside", "Hent fra nettsiden"],
  ["#bibliotek", "Logoer og bilder"],
  ["#typografi", "Typografi"],
] as const;

export default function ProfilePage() {
  return (
    <>
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Merkevareprofil</h1>
        <p className="max-w-2xl text-ink-soft">Dette er det Spott skriver ut fra. Jo mer presist du fyller ut, jo bedre blir utkastene.</p>
        <nav aria-label="På denne siden" className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <ul className="flex gap-2">
            {SECTIONS.map(([href, label]) => (
              <li key={href} className="shrink-0">
                <a href={href} className="block rounded-full border border-line px-3.5 py-1.5 text-sm font-semibold text-ink-soft hover:text-ink">{label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <Suspense fallback={<Loading />}>
        <SavedProfile />
      </Suspense>
    </>
  );
}

async function SavedProfile() {
  const { supabase, org } = await requireOrg();
  const { data } = await supabase
    .from("brand_profiles")
    .select("website_url, tone, audience, products, avoid, language")
    .eq("org_id", org.id)
    .maybeSingle<BrandProfile>();
  return (
    <>
      <section id="om-bedriften" className="scroll-mt-24" aria-label="Om bedriften">
        <ProfileForm profile={data ?? null} />
      </section>
      <BrandWebsiteImporter defaultWebsite={data?.website_url ?? null} />
      <BrandLibrary orgId={org.id} />
      <TypographyEditor orgId={org.id} />
    </>
  );
}
