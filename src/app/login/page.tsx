import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Field, SubmitButton } from "@/components/form";
import { Notice } from "@/components/notice";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { login, signup } from "./actions";

export const metadata: Metadata = { title: "Logg inn · MyMarketing" };

const MESSAGES: Record<string, { tone: "info" | "error"; text: string }> = {
  feil: { tone: "error", text: "Feil e-post eller passord." },
  bekreft: { tone: "error", text: "Du må bekrefte e-posten før du kan logge inn. Sjekk innboksen din." },
  vent: { tone: "error", text: "For mange forsøk. Vent litt og prøv igjen." },
  teknisk: { tone: "error", text: "Noe gikk galt hos oss. Prøv igjen om litt." },
  ugyldig: { tone: "error", text: "Skriv inn en gyldig e-post og et passord på minst 8 tegn." },
  registrering: { tone: "error", text: "Vi klarte ikke å opprette kontoen. Prøv igjen." },
  lenke: { tone: "error", text: "Lenken er ugyldig eller utløpt. Logg inn, eller opprett kontoen på nytt." },
  "sjekk-epost": { tone: "info", text: "Sjekk e-posten din og trykk på lenken for å bekrefte kontoen." },
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// Innloggede sendes videre til appen av proxyen, så skjemaet kan være statisk.
// Bare meldingen leser fra adressen og strømmes inn etterpå.
export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const configured = isSupabaseConfigured();

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <header className="flex flex-col gap-1">
        <Link href="/" className="text-sm opacity-70">
          MyMarketing
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Logg inn</h1>
      </header>

      {!configured ? (
        <Notice>Databasen er ikke koblet til ennå, så innlogging er ikke mulig.</Notice>
      ) : null}
      <Suspense fallback={null}>
        <LoginMessage searchParams={searchParams} />
      </Suspense>

      <form className="flex flex-col gap-4">
        <Field label="E-post" name="email" type="email" autoComplete="email" required />
        <Field
          label="Passord"
          name="password"
          type="password"
          autoComplete="current-password"
          hint="Minst 8 tegn når du oppretter konto."
          required
        />
        <div className="flex flex-col gap-2 pt-2">
          <SubmitButton formAction={login} disabled={!configured}>
            Logg inn
          </SubmitButton>
          <SubmitButton formAction={signup} variant="secondary" disabled={!configured}>
            Opprett konto
          </SubmitButton>
        </div>
      </form>
    </main>
  );
}

async function LoginMessage({ searchParams }: { searchParams: SearchParams }) {
  const { melding } = await searchParams;
  const message = typeof melding === "string" ? MESSAGES[melding] : undefined;
  return message ? <Notice tone={message.tone}>{message.text}</Notice> : null;
}
