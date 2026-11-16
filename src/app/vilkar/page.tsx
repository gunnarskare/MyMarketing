import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { company } from "@/lib/company";

export const metadata: Metadata = {
  title: "Vilkår",
  description: `Vilkårene for å bruke Spott, en tjeneste fra ${company.legalName}.`,
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto w-full max-w-6xl px-6 pt-10 pb-24">
          <h1 className="text-[clamp(2.25rem,9vw,4rem)] leading-none font-black tracking-[-0.03em]">Vilkår</h1>
          <p className="mt-4 text-ink-soft">Sist oppdatert 16. november 2026</p>

          <div className="legal mt-10">
            <p>
              Disse vilkårene er avtalen mellom bedriften som bruker Spott, og {company.legalName}{" "}
              (org.nr.{" "}{company.orgNumber}), som leverer tjenesten. «Du» betyr bedriften og alle som
              bruker kontoen på vegne av den. «Vi» betyr {company.legalName}.
            </p>
            <p>
              Når du oppretter en konto eller starter et abonnement, godtar du vilkårene og bekrefter at du har
              lov til å inngå avtalen på vegne av bedriften.
            </p>

            <h2>Hvem Spott er for</h2>
            <p>
              Spott er for næringsdrivende. Tjenesten er ikke laget for forbrukere, og reglene om angrerett for
              forbrukere gjelder derfor ikke. Du må være minst 18 år for å opprette en konto.
            </p>

            <h2>Hva Spott gjør</h2>
            <p>
              Spott leser de offentlige sidene på nettsiden du oppgir, og lager en merkevareprofil og en
              merkevareanalyse. Ut fra dem lager Spott forslag til innlegg i sosiale medier. Analysen og
              forslagene lages med kunstig intelligens.
            </p>
            <p>
              Spott er under utvikling. Vi kan legge til, endre og fjerne funksjoner. Gjør en endring tjenesten
              vesentlig dårligere for deg, sier vi fra på e-post før den gjelder, og du kan si opp abonnementet
              før det fornyes.
            </p>

            <h2>Kontoen</h2>
            <ul>
              <li>Opplysningene du gir oss, skal være riktige.</li>
              <li>
                Du er ansvarlig for alt som skjer med kontoen, og for at passordet ikke kommer på avveie. Si fra
                til oss med en gang hvis du tror noen andre har fått tilgang.
              </li>
            </ul>

            <h2>Abonnement og betaling</h2>
            <ul>
              <li>
                Abonnementet koster 2{" "}990 kr per måned eks. mva., med mindre annet er avtalt skriftlig.
              </li>
              <li>
                Du betaler forskuddsvis med kort. Betalingen håndteres av Stripe. Abonnementet fornyes automatisk
                hver måned til du sier det opp.
              </li>
              <li>
                Det er ingen bindingstid. Du sier opp under Abonnement i Spott. Du beholder tilgangen ut perioden
                du har betalt for. Vi betaler ikke tilbake for en påbegynt periode.
              </li>
              <li>
                Går en betaling ikke gjennom, prøver vi igjen i en periode. Lykkes det ikke, avsluttes
                abonnementet, og funksjonene som krever abonnement, slås av.
              </li>
              <li>
                Vi kan endre prisen. Da sier vi fra på e-post minst 30 dager før den nye prisen gjelder. Vil du
                ikke betale den nye prisen, kan du si opp før endringen.
              </li>
            </ul>

            <h2>Innholdet ditt</h2>
            <ul>
              <li>
                Bedriften eier det dere legger inn i Spott: tekster, logoer, bilder og fonter. Innleggene Spott
                lager for dere, kan dere bruke fritt. Vi gjør ikke krav på rettigheter til dem.
              </li>
              <li>
                Du gir oss rett til å lagre og behandle innholdet, og sende det til leverandørene våre, så langt
                det trengs for å levere Spott. Vi bruker det ikke til noe annet, og vi bruker det ikke i vår egen
                markedsføring uten at du har sagt ja.
              </li>
              <li>
                Du står inne for at bedriften har rett til å bruke det dere laster opp, og at nettsiden du oppgir
                er bedriftens egen eller en side dere har lov til å bruke. Fonter har ofte lisenser som begrenser
                hvor de kan brukes. Det er bedriftens ansvar å ha lisens.
              </li>
            </ul>

            <h2>Innhold laget med kunstig intelligens</h2>
            <p>
              Kunstig intelligens kan ta feil. Et forslag kan inneholde feil om fakta, priser og tilbud, bruke
              feil tone, eller ligne på tekst andre har skrevet.
            </p>
            <ul>
              <li>
                Du må lese og godkjenne hvert innlegg før det publiseres. Spott publiserer ingenting du ikke har
                godkjent.
              </li>
              <li>
                Bedriften er ansvarlig for det som publiseres i bedriftens navn. Det gjelder også at innholdet
                følger markedsføringsloven, opphavsretten og reglene til plattformen det publiseres på.
              </li>
              <li>Vi lover ikke bestemte resultater, som rekkevidde, følgere eller salg.</li>
            </ul>

            <h2>Tilkobling til sosiale medier</h2>
            <p>
              Kobler du en konto på Facebook, Instagram eller LinkedIn til Spott, gir du oss lov til å publisere
              innleggene du har godkjent, på kontoene du har valgt og til tidene du har valgt. Du gir oss også lov
              til å hente tall for innleggene, som visninger og reaksjoner.
            </p>
            <ul>
              <li>
                Tilgangen lagres kryptert og brukes bare til dette. Du kan koble fra når som helst, i Spott eller
                hos plattformen.
              </li>
              <li>
                Du må følge vilkårene til plattformene. Vi er ikke ansvarlige hvis en plattform endrer eller
                stenger tilgangen, eller begrenser eller stenger bedriftens konto.
              </li>
            </ul>

            <h2>Dette kan du ikke bruke Spott til</h2>
            <ul>
              <li>Innhold som er ulovlig, villedende, hatefullt eller trakasserende.</li>
              <li>Innhold som krenker andres rettigheter, som opphavsrett, varemerker eller personvern.</li>
              <li>Søppelpost og masseutsendelser.</li>
              <li>
                Å prøve å omgå bruksgrensene, få tilgang til andres data, angripe eller overbelaste tjenesten,
                eller hente ut data automatisk.
              </li>
              <li>Å selge tjenesten videre uten skriftlig avtale med oss.</li>
            </ul>
            <p>
              Det er grenser for hvor mange AI-oppgaver hver bedrift kan kjøre per døgn. De er satt for å holde
              tjenesten stabil og kostnadene forutsigbare, og de dekker vanlig bruk.
            </p>

            <h2>Drift og tilgjengelighet</h2>
            <p>
              Vi gjør vårt beste for at Spott skal være tilgjengelig og virke som det skal. Vi kan likevel ikke
              love at tjenesten alltid er tilgjengelig eller uten feil. Spott kan være nede for vedlikehold, eller
              fordi en leverandør har problemer.
            </p>

            <h2>Ansvar</h2>
            <ul>
              <li>
                Vi er ikke ansvarlige for indirekte tap, som tapt omsetning eller fortjeneste, eller for tap som
                skyldes innhold du har godkjent eller publisert.
              </li>
              <li>
                Vårt samlede ansvar er begrenset til det bedriften har betalt for Spott de siste 12 månedene før
                det som gir grunnlag for kravet.
              </li>
              <li>Begrensningene gjelder ikke hvis vi har opptrådt grovt uaktsomt eller med vilje.</li>
              <li>
                Bedriften dekker krav fra andre som skyldes innhold bedriften har lastet opp eller publisert.
              </li>
              <li>
                Ingen av oss er ansvarlige for forsinkelser eller feil som skyldes forhold utenfor vår kontroll,
                som strømbrudd, store nettverksfeil, streik eller myndighetspålegg.
              </li>
            </ul>

            <h2>Personvern</h2>
            <p>
              <Link href="/personvern">Personvernerklæringen</Link> forklarer hvordan vi behandler
              personopplysninger. Legger bedriften inn personopplysninger om andre, for eksempel bilder av
              ansatte, behandler vi dem på vegne av bedriften. Da bruker vi dem bare for å levere Spott, etter
              disse vilkårene. Ta kontakt hvis bedriften trenger en egen databehandleravtale.
            </p>

            <h2>Oppsigelse og sletting</h2>
            <ul>
              <li>Du kan si opp abonnementet når som helst, som beskrevet over.</li>
              <li>
                Vil du at vi sletter kontoen og alt bedriften har lagt inn, sender du oss en e-post, som
                beskrevet på <Link href="/sletting">siden om sletting</Link>. Vi sletter uten ugrunnet opphold. Opplysninger som bokføringsloven krever at vi tar vare på, som fakturaer,
                beholder vi så lenge loven krever. Vil du ha en kopi av innholdet først, sier du fra.
              </li>
              <li>
                Vi kan si opp avtalen med 30 dagers varsel. Gjør vi det uten at du har brutt vilkårene, betaler vi
                tilbake det du har betalt for tiden som gjenstår.
              </li>
              <li>
                Bryter du vilkårene vesentlig, for eksempel ved misbruk, kan vi stenge kontoen med en gang.
              </li>
            </ul>

            <h2>Endringer i vilkårene</h2>
            <p>
              Vi kan endre vilkårene. Vesentlige endringer varsler vi på e-post minst 30 dager før de gjelder.
              Bruker du Spott etter det, gjelder de nye vilkårene. Er du ikke enig, kan du si opp før endringen.
              Datoen øverst viser når vilkårene sist ble endret.
            </p>

            <h2>Lovvalg og tvister</h2>
            <p>
              Norsk rett gjelder for avtalen. Er vi uenige, prøver vi først å løse det i minnelighet. Lykkes ikke
              det, avgjøres saken av norske domstoler, med verneting der {company.legalName} har
              forretningsadresse.
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
