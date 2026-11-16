import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { company } from "@/lib/company";

export const metadata: Metadata = {
  title: "Slett dataene dine",
  description: "Slik ber du om at kontoen og alle opplysningene i Spyd slettes, og slik fjerner du Spyds tilgang til Facebook, Instagram og LinkedIn.",
};

const deleteMail = company.email
  ? `mailto:${company.email}?subject=${encodeURIComponent("Slett kontoen min i Spyd")}`
  : null;

export default function DataDeletionPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto w-full max-w-6xl px-6 pt-10 pb-24">
          <h1 className="font-serif text-[clamp(2.5rem,8vw,4rem)] leading-[1.05] tracking-[-0.015em]">
            Slett dataene dine
          </h1>
          <p className="mt-4 text-ink-soft">Sist oppdatert 16. november 2026</p>

          <div className="legal mt-10">
            <p>
              Du kan når som helst be oss slette kontoen din og alt bedriften har lagt inn i Spyd. Vi sletter
              senest innen én måned og sier fra på e-post når det er gjort.
            </p>

            <h2 id="be-om-sletting" className="scroll-mt-6">Be oss slette kontoen</h2>
            <ul>
              <li>
                Send en e-post til{" "}
                {deleteMail ? <a href={deleteMail}>{company.email}</a> : "oss"} fra adressen du logger inn
                med. Da vet vi at det er du som spør.
              </li>
              <li>Skriv at du vil slette kontoen, og navnet på bedriften.</li>
              <li>Har bedriften et aktivt abonnement, sier vi det opp samtidig.</li>
              <li>Vil du ha en kopi av innholdet før vi sletter, skriver du det i e-posten.</li>
            </ul>

            <h2>Dette sletter vi</h2>
            <ul>
              <li>Kontoen din: e-postadressen og innloggingen.</li>
              <li>Bedriften og merkevareprofilen.</li>
              <li>Merkevareanalysen og teksten Spyd har lest fra nettsiden.</li>
              <li>Alle innlegg og utkast i Spyd.</li>
              <li>Logoer, bilder og fonter i biblioteket.</li>
              <li>Tilkoblede kontoer på Facebook, Instagram og LinkedIn, og tilgangsnøklene til dem.</li>
            </ul>
            <p>
              Innlegg som allerede er publisert, ligger hos plattformen. Dem sletter du på Facebook, Instagram
              eller LinkedIn.
            </p>

            <h2>Dette beholder vi</h2>
            <ul>
              <li>
                Fakturaer og betalingsopplysninger, så lenge bokføringsloven krever det. De ligger hos oss og hos
                betalingstjenesten Stripe.
              </li>
              <li>Tekniske logger hos leverandørene våre. De slettes automatisk etter en begrenset periode.</li>
            </ul>

            <h2 id="facebook-og-instagram" className="scroll-mt-6">Fjern Spyds tilgang til Facebook og Instagram</h2>
            <p>Har du koblet Facebook eller Instagram til Spyd, kan du fjerne tilgangen hos Facebook:</p>
            <ul>
              <li>Gå til Innstillinger og personvern, og så Innstillinger.</li>
              <li>
                Åpne Apper og nettsteder. Har du koblet til en Facebook-side, ligger Spyd under
                Bedriftsintegrasjoner.
              </li>
              <li>Velg Spyd, og trykk Fjern.</li>
            </ul>
            <p>
              Instagram-tilgangen går gjennom Facebook-siden, så den forsvinner samtidig. Menyene kan hete litt
              annerledes i appen enn i nettleseren.
            </p>

            <h2 id="linkedin" className="scroll-mt-6">Fjern Spyds tilgang til LinkedIn</h2>
            <ul>
              <li>Gå til Innstillinger, og så Personvern for data.</li>
              <li>Åpne Tillatte tjenester, velg Spyd og fjern tilgangen.</li>
            </ul>

            <h2>Når du bare fjerner tilgangen</h2>
            <p>
              Fjerner du tilgangen hos Facebook eller LinkedIn, kan Spyd ikke lenger publisere eller hente tall
              fra kontoene. Opplysningene som ligger i Spyd, slettes ikke av det alene. Vil du ha dem slettet,
              ber du oss om det <a href="#be-om-sletting">som beskrevet over</a>.
            </p>
            <p>
              Les mer om hvilke opplysninger vi behandler og hvorfor i{" "}
              <Link href="/personvern">personvernerklæringen</Link>.
            </p>

            <h2 id="kontakt" className="scroll-mt-6">
              Kontakt
            </h2>
            <p>
              {company.legalName}, org.nr.{" "}{company.orgNumber}
              {company.address ? `, ${company.address}` : null}.
            </p>
            {company.email ? (
              <p>
                E-post: <a href={`mailto:${company.email}`}>{company.email}</a>
              </p>
            ) : null}
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
