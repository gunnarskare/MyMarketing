import Image from "next/image";
import Link from "next/link";
import { ExampleBrandCard } from "@/components/example-brand-card";
import { ArrowRightIcon } from "@/components/icons";
import { Journey } from "@/components/journey";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { button, link } from "@/components/ui";
import cabin from "@/images/fjordbygg-hytte.jpg";
import marketer from "@/images/markedsforer-og-kunde.jpg";
import { company } from "@/lib/company";

const promises = [
  {
    title: "Ingenting går ut uten deg",
    text: "Hvert innlegg venter til du har lest og godkjent det.",
  },
  {
    title: "Lagret i EU",
    text: "Kontoen og opplysningene om bedriften ligger i en database i Stockholm.",
  },
  {
    title: "Et norsk selskap",
    text: `Spyd leveres av ${company.legalName}. Vi selger ikke opplysningene dine videre.`,
  },
];

const included = [
  "Merkevareprofil og AI-analyse av nettsiden",
  "Bibliotek for logoer, bilder og fonter",
  "Ukas innlegg til Facebook, Instagram og LinkedIn, klare til godkjenning",
];

// Venstre kolonne i delte seksjoner følger innholdsbredden (72rem), mens bildet går helt ut til kanten.
const alignToContent = "px-6 lg:pr-14 lg:[padding-inline-start:max(1.5rem,calc(50vw-34.5rem))]";

const bookChat = company.email
  ? `mailto:${company.email}?subject=${encodeURIComponent("Lei inn en markedsfører")}`
  : "/login";

// Innloggede sendes videre til appen av proxyen (src/lib/supabase/proxy.ts),
// så forsiden er helt statisk.
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="on-dark bg-terra text-paper">
          <div className="grid lg:min-h-[38rem] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            <div className={`${alignToContent} flex flex-col justify-center pt-12 pb-6 sm:pt-16 sm:pb-10 lg:py-24`}>
              <h1 className="max-w-[9em] font-serif text-[clamp(2rem,10.4vw,4rem)] leading-[1.02] tracking-[-0.02em] text-balance">
                <span className="whitespace-nowrap">AI-markedsføring</span> med tydelig retning.
              </h1>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-white sm:text-xl">
                Fra merkevareprofil til publisert innhold. Spyd lager ukas innlegg ut fra merkevaren deres, og du godkjenner før noe publiseres.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
                <Link href="/login" className={button.light}>
                  Lag merkevareprofil
                </Link>
                <a href="#plattformen" className="rounded-sm font-semibold text-white underline decoration-1 underline-offset-4 hover:decoration-2">
                  Slik virker det
                </a>
              </div>
            </div>
            <div className="relative min-h-[24rem] sm:min-h-[30rem] lg:min-h-0">
              <div className="absolute inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%,0_42%)] lg:[clip-path:polygon(26%_0,100%_0,100%_100%,0_100%)]">
                <Image
                  src={cabin}
                  alt="Moderne hytte i mørkt treverk på svaberg ved sjøen, med furutrær rundt"
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  placeholder="blur"
                  loading="eager"
                  fetchPriority="high"
                  className="object-cover"
                />
              </div>
              <ExampleBrandCard compact className="absolute bottom-6 left-6 w-[min(19rem,calc(100%-3rem))] lg:bottom-12 lg:left-16" />
            </div>
          </div>
        </section>

        <section id="plattformen" className="scroll-mt-4">
          <div className="mx-auto w-full max-w-6xl px-6 py-20 lg:py-28">
            <h2 className="max-w-3xl font-serif text-[clamp(2.25rem,6vw,3.5rem)] leading-[1.05] tracking-[-0.015em] text-balance">
              Fra merkevare til publisering
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
              Fire steg, og du bestemmer i hvert av dem. Se hvordan det blir for Fjordbygg, en tenkt boligbygger.
            </p>
            <div className="mt-12 lg:mt-16">
              <Journey />
            </div>
          </div>
        </section>

        <section id="markedsforere" className="scroll-mt-4 bg-sand">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className={`${alignToContent} flex flex-col justify-center py-16 lg:py-24`}>
              <h2 className="max-w-[14ch] font-serif text-[clamp(2.25rem,6vw,3.5rem)] leading-[1.05] tracking-[-0.015em] text-balance">
                Lei inn en markedsfører
              </h2>
              <p className="mt-5 max-w-md text-xl leading-relaxed">Få hjelp til strategi, innholdsplan og kvalitetssikring.</p>
              <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
                Vi bruker AI der det gir bedre arbeidsflyt, for eksempel til analyse, idéarbeid og utkast. En markedsfører har
                ansvar for faglige valg, kvalitet og budskap.
              </p>
              <p className="mt-8">
                <a href={bookChat} className={`${link} inline-flex items-center gap-2 text-lg`}>
                  Book en prat
                  <ArrowRightIcon className="size-5" />
                </a>
              </p>
            </div>
            <div className="relative min-h-[18rem] sm:min-h-[26rem]">
              <Image
                src={marketer}
                alt="En markedsfører og en kunde går gjennom trykte utkast ved et arbeidsbord"
                fill
                sizes="(min-width: 1024px) 52vw, 100vw"
                placeholder="blur"
                className="object-cover"
              />
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto w-full max-w-6xl px-6 py-20 lg:py-28">
            <h2 className="font-serif text-[clamp(2.25rem,6vw,3.5rem)] leading-[1.05] tracking-[-0.015em]">Du har kontrollen</h2>
            <ul className="mt-12 grid gap-10 lg:grid-cols-3">
              {promises.map((promise) => (
                <li key={promise.title} className="border-t border-ink pt-5">
                  <h3 className="text-xl font-semibold">{promise.title}</h3>
                  <p className="mt-2 max-w-sm leading-relaxed text-ink-soft">{promise.text}</p>
                </li>
              ))}
            </ul>
            <p className="mt-12">
              <Link href="/personvern" className={link}>
                Les personvernerklæringen
              </Link>
            </p>
          </div>
        </section>

        <section id="pris" className="scroll-mt-4 border-t border-line">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-20 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-28">
            <div>
              <h2 className="font-serif text-[clamp(2.25rem,6vw,3.5rem)] leading-[1.05] tracking-[-0.015em] text-balance">
                Én pris, alt inkludert
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
                Ingen bindingstid. Si opp når du vil, og behold tilgangen ut måneden du har betalt for.
              </p>
            </div>
            <div className="rounded-xl bg-sand p-6 sm:p-8">
              <p className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-serif text-6xl tracking-[-0.02em] tabular-nums">2&nbsp;990&nbsp;kr</span>
                <span className="text-lg text-ink-soft">per måned, eks. mva.</span>
              </p>
              <ul className="mt-6 flex flex-col gap-3">
                {included.map((item) => (
                  <li key={item} className="flex gap-3 leading-relaxed">
                    <span aria-hidden="true" className="mt-2.5 h-px w-4 shrink-0 bg-terra" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/login" className={`${button.primary} mt-8`}>
                Lag merkevareprofil
              </Link>
            </div>
          </div>
        </section>

        <section className="on-dark bg-terra text-paper">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-6 py-20 text-center lg:py-24">
            <h2 className="font-serif text-[clamp(2.25rem,6vw,3.75rem)] leading-[1.05] tracking-[-0.015em] text-balance">
              Bygg merkevareprofilen deres
            </h2>
            <p className="max-w-lg text-lg leading-relaxed text-white">
              Det tar et par minutter. Du trenger bare en e-postadresse og nettsiden til bedriften.
            </p>
            <Link href="/login" className={`${button.light} px-10`}>
              Kom i gang
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
