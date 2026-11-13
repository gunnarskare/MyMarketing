import type { Metadata } from "next";
import { Suspense } from "react";
import { Field, SubmitButton, TextArea } from "@/components/form";
import { Loading } from "@/components/loading";
import { Notice } from "@/components/notice";
import { requireOrg } from "@/lib/auth";
import { LANGUAGES, MAX_TEXT_LENGTH, type BrandProfile } from "@/lib/brand-profile";
import { saveProfile } from "./actions";

export const metadata: Metadata = { title: "Merkevareprofil · MyMarketing" };

const ERRORS: Record<string, string> = {
  nettside: "Nettadressen ser ikke riktig ut. Prøv for eksempel dinbedrift.no.",
  lengde: `Hvert felt kan ha opptil ${MAX_TEXT_LENGTH} tegn.`,
  lagring: "Vi klarte ikke å lagre profilen. Prøv igjen.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function ProfilePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Merkevareprofil</h1>
        <p className="opacity-70">
          Dette er det AI-en skriver ut fra. Jo mer presist du fyller ut, jo bedre blir utkastene.
        </p>
      </header>
      <Suspense fallback={<Loading />}>
        <ProfileForm searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ProfileForm({ searchParams }: { searchParams: SearchParams }) {
  const { supabase, org } = await requireOrg();
  const { data } = await supabase
    .from("brand_profiles")
    .select("website_url, tone, audience, products, avoid, language")
    .eq("org_id", org.id)
    .maybeSingle<BrandProfile>();

  const { feil, lagret } = await searchParams;
  const error = typeof feil === "string" ? ERRORS[feil] : undefined;

  return (
    <>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {lagret && !error ? <Notice>Profilen er lagret.</Notice> : null}

      <form action={saveProfile} className="flex flex-col gap-5">
        <Field
          label="Nettside"
          name="website_url"
          inputMode="url"
          autoComplete="url"
          placeholder="dinbedrift.no"
          defaultValue={data?.website_url ?? ""}
        />
        <TextArea
          label="Tone"
          name="tone"
          hint="Hvordan skal dere høres ut? For eksempel vennlig, faglig eller uformell."
          maxLength={MAX_TEXT_LENGTH}
          defaultValue={data?.tone ?? ""}
        />
        <TextArea
          label="Målgruppe"
          name="audience"
          hint="Hvem skriver dere til?"
          maxLength={MAX_TEXT_LENGTH}
          defaultValue={data?.audience ?? ""}
        />
        <TextArea
          label="Produkter og tjenester"
          name="products"
          hint="Det dere selger, og hva som skiller dere fra andre."
          maxLength={MAX_TEXT_LENGTH}
          defaultValue={data?.products ?? ""}
        />
        <TextArea
          label="Unngå"
          name="avoid"
          hint="Ord, temaer eller påstander som aldri skal brukes."
          maxLength={MAX_TEXT_LENGTH}
          defaultValue={data?.avoid ?? ""}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="language" className="text-sm font-medium">
            Språk i innleggene
          </label>
          <select
            id="language"
            name="language"
            defaultValue={data?.language ?? "nb"}
            className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2.5 text-base dark:border-white/20"
          >
            {LANGUAGES.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <SubmitButton>Lagre profilen</SubmitButton>
        </div>
      </form>
    </>
  );
}
