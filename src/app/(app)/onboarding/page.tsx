import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Field, SubmitButton } from "@/components/form";
import { Loading } from "@/components/loading";
import { Notice } from "@/components/notice";
import { getCurrentOrg, requireUser } from "@/lib/auth";
import { createOrganization } from "./actions";

export const metadata: Metadata = { title: "Kom i gang" };

const ERRORS: Record<string, string> = {
  navn: "Skriv inn et bedriftsnavn på mellom 1 og 120 tegn.",
  lagring: "Vi klarte ikke å opprette bedriften. Prøv igjen.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function OnboardingPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight">Hvilken bedrift gjelder det?</h1>
        <p className="text-ink-soft">Du kan endre navnet senere.</p>
      </header>
      <Suspense fallback={<Loading />}>
        <OnboardingForm searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function OnboardingForm({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  if (await getCurrentOrg()) redirect("/profil");

  const { feil } = await searchParams;
  const error = typeof feil === "string" ? ERRORS[feil] : undefined;

  return (
    <>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <form action={createOrganization} className="flex flex-col gap-4">
        <Field label="Bedriftsnavn" name="name" autoComplete="organization" maxLength={120} required />
        <div>
          <SubmitButton>Fortsett</SubmitButton>
        </div>
      </form>
    </>
  );
}
