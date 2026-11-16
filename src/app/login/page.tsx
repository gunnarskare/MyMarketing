import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Field, SubmitButton } from "@/components/form";
import { Notice } from "@/components/notice";
import { SpearSymbol, Wordmark } from "@/components/wordmark";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isGoogleLoginEnabled } from "@/lib/supabase/providers";
import { login, signInWithGoogle, signup } from "./actions";

export const metadata: Metadata = { title: "Logg inn" };

const MESSAGES: Record<string, { tone: "info" | "error"; text: string }> = {
  feil: { tone: "error", text: "Feil e-post eller passord." },
  bekreft: { tone: "error", text: "Du må bekrefte e-posten før du kan logge inn. Sjekk innboksen din." },
  vent: { tone: "error", text: "For mange forsøk. Vent litt og prøv igjen." },
  teknisk: { tone: "error", text: "Noe gikk galt hos oss. Prøv igjen om litt." },
  google: { tone: "error", text: "Innloggingen med Google ble ikke fullført. Prøv igjen." },
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
    <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="on-dark relative hidden flex-col justify-between overflow-hidden bg-terra p-12 text-paper lg:flex">
        <Link href="/" className="self-start rounded-sm">
          <Wordmark tone="mono" className="h-12 w-auto" />
        </Link>
        <div className="relative">
          <p className="max-w-[11em] font-serif text-5xl leading-[1.05] tracking-[-0.015em]">Markedsføring med tydelig retning</p>
          <p className="mt-5 max-w-sm text-lg leading-relaxed text-white">
            Fra merkevareprofil til ferdige innlegg. Du godkjenner før noe publiseres.
          </p>
        </div>
        <SpearSymbol className="pointer-events-none absolute -right-16 -bottom-20 size-[26rem] text-paper/10" />
      </aside>

      <main className="mx-auto flex w-full max-w-sm flex-col justify-center gap-6 px-6 py-16">
        <header className="flex flex-col gap-8">
          <Link href="/" className="self-start rounded-sm lg:hidden">
            <Wordmark className="h-11 w-auto" />
          </Link>
          <h1 className="font-serif text-5xl tracking-[-0.015em]">Logg inn</h1>
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

        {configured ? (
          <Suspense fallback={null}>
            <GoogleLogin />
          </Suspense>
        ) : null}

        <p className="text-sm leading-relaxed text-ink-soft">
          Når du oppretter en konto, godtar du{" "}
          <Link href="/vilkar" className="font-semibold text-terra-deep underline underline-offset-2">
            vilkårene
          </Link>{" "}
          på vegne av bedriften. Les hvordan vi behandler opplysningene dine i{" "}
          <Link href="/personvern" className="font-semibold text-terra-deep underline underline-offset-2">
            personvernerklæringen
          </Link>
          .
        </p>
      </main>
    </div>
  );
}

/** Vises bare når Google er slått på som innloggingsmåte i Supabase. */
async function GoogleLogin() {
  if (!(await isGoogleLoginEnabled())) return null;
  return (
    <form action={signInWithGoogle} className="flex flex-col gap-4">
      <p className="flex items-center gap-3 text-sm text-ink-soft">
        <span aria-hidden className="h-px flex-1 bg-line" />
        eller
        <span aria-hidden className="h-px flex-1 bg-line" />
      </p>
      <SubmitButton variant="secondary">Fortsett med Google</SubmitButton>
    </form>
  );
}

async function LoginMessage({ searchParams }: { searchParams: SearchParams }) {
  const { melding } = await searchParams;
  const message = typeof melding === "string" ? MESSAGES[melding] : undefined;
  return message ? <Notice tone={message.tone}>{message.text}</Notice> : null;
}
