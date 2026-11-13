import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { company } from "@/lib/company";

export const metadata: Metadata = {
  title: "Personvernerklæring",
  description: `Slik behandler ${company.legalName} personopplysninger i Spott.`,
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto w-full max-w-6xl px-6 pt-10 pb-24">
          <h1 className="text-[clamp(2.25rem,9vw,4rem)] leading-none font-black tracking-[-0.03em]">
            Personvern&shy;erklæring
          </h1>
          <p className="mt-4 text-ink-soft">Sist oppdatert 13. november 2026</p>

          <div className="legal mt-10">
            <p>
              Spott er en tjeneste fra {company.legalName} (org.nr.{"\u00a0"}{company.orgNumber}). Vi er
              behandlingsansvarlig for personopplysningene som behandles når du bruker Spott. Her
              står det hvilke opplysninger vi behandler, hvorfor vi gjør det, og hvilke rettigheter
              du har.
            </p>

            <h2>Opplysninger vi behandler</h2>
            <ul>
              <li>
                <strong>Konto:</strong> e-postadressen din og passordet ditt. Passordet lagres som
                en enveiskode, så verken vi eller andre kan lese det.
              </li>
              <li>
                <strong>Bedriften:</strong> bedriftsnavnet og merkevareprofilen du fyller ut:
                nettside, tone, målgruppe, produkter og tjenester, ting dere vil unngå, og språk.
                Dette er opplysninger om bedriften, men de kan inneholde personopplysninger hvis du
                skriver dem inn.
              </li>
              <li>
                <strong>Teknisk:</strong> IP-adresse, tidspunkt og hvilken nettleser du bruker. Dette
                havner i serverlogger når du besøker nettsiden.
              </li>
            </ul>
            <p>
              Vi bruker ikke analyseverktøy eller reklamesporing, og vi henter ikke opplysninger om
              deg fra andre.
            </p>

            <h2>Hva vi bruker opplysningene til</h2>
            <ul>
              <li>
                <strong>Levere tjenesten:</strong> opprette kontoen din, logge deg inn og lagre det
                du legger inn. Grunnlaget er avtalen med deg (personvernforordningen artikkel 6 nr. 1
                bokstav b).
              </li>
              <li>
                <strong>Sende nødvendig e-post:</strong> for eksempel lenken som bekrefter kontoen
                din. Grunnlaget er avtalen med deg.
              </li>
              <li>
                <strong>Sikkerhet og feilsøking:</strong> oppdage misbruk og rette feil. Grunnlaget er
                vår berettigede interesse i en trygg og stabil tjeneste (artikkel 6 nr. 1 bokstav f).
              </li>
            </ul>
            <p>Vi sender ikke markedsføring på e-post uten at du har bedt om det.</p>

            <h2>Informasjonskapsler</h2>
            <p>
              Spott bruker bare informasjonskapsler som trengs for at innloggingen skal virke. De
              holder deg innlogget, og de slettes når du logger ut eller når de utløper. Fordi de er
              nødvendige for tjenesten du har bedt om, ber vi ikke om samtykke til dem.
            </p>
            <p>Vi bruker ingen informasjonskapsler til analyse eller markedsføring.</p>

            <h2>Leverandører som behandler opplysninger for oss</h2>
            <ul>
              <li>
                <strong>Supabase</strong> lagrer databasen og håndterer innloggingen. Opplysningene
                ligger i EU, i Stockholm.
              </li>
              <li>
                <strong>Vercel</strong> drifter nettsiden. Koden kjører i Stockholm. Tekniske
                opplysninger, som IP-adresser i logger, kan bli behandlet utenfor EØS.
              </li>
            </ul>
            <p>
              Begge er amerikanske selskaper. Når personopplysninger overføres ut av EØS, skjer det
              med et overføringsgrunnlag som personvernforordningen godtar, som EUs standard
              personvernbestemmelser.
            </p>
            <p>
              Vi selger ikke personopplysninger, og vi deler dem ikke med andre enn leverandørene
              over, med mindre loven krever det.
            </p>

            <h2>Hvor lenge vi lagrer opplysningene</h2>
            <p>
              Kontoen og opplysningene om bedriften lagres så lenge du har konto hos oss. Ber du oss
              slette kontoen, sletter vi opplysningene uten ugrunnet opphold, med mindre loven
              pålegger oss å beholde noe lenger.
            </p>
            <p>Tekniske logger lagres i en begrenset periode hos leverandørene våre.</p>

            <h2>Rettighetene dine</h2>
            <p>
              Du kan be om innsyn i opplysningene vi har om deg, få dem rettet eller slettet, be oss
              begrense behandlingen, få dem utlevert i et vanlig filformat, og protestere mot
              behandling som bygger på berettiget interesse.
            </p>
            <p>
              <a href="#kontakt">Ta kontakt med oss</a> for å bruke rettighetene. Vi svarer innen én
              måned.
            </p>
            <p>
              Mener du at vi behandler opplysningene dine i strid med regelverket, kan du klage til{" "}
              <a href="https://www.datatilsynet.no" rel="noopener">
                Datatilsynet
              </a>
              .
            </p>

            <h2>Sikkerhet</h2>
            <p>
              All trafikk til Spott er kryptert. Databasen har tilgangsregler som gjør at én kunde
              ikke kan se en annen kundes opplysninger, og passord lagres aldri i lesbar form.
            </p>

            <h2>Når tjenesten endres</h2>
            <p>
              Spott er under utvikling. Før vi tar i bruk nye funksjoner som behandler
              personopplysninger på nye måter, for eksempel tilkobling til kontoer i sosiale medier
              eller utkast skrevet av kunstig intelligens, oppdaterer vi denne erklæringen. Datoen
              øverst viser når den sist ble endret.
            </p>

            <h2 id="kontakt" className="scroll-mt-6">
              Kontakt
            </h2>
            <p>
              {company.legalName}, org.nr.{"\u00a0"}{company.orgNumber}
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
