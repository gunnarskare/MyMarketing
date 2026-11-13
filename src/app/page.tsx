import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WeekDemo } from "@/components/week-demo";
import { company } from "@/lib/company";

const steps = [
  {
    title: "Fortell om bedriften",
    text: "Legg inn nettsiden og beskriv hvordan dere vil høres ut. Det blir merkevareprofilen Spott skriver ut fra.",
  },
  {
    title: "Få ukas utkast",
    text: "Hver uke lager Spott ferdige innlegg, tilpasset Facebook, Instagram og LinkedIn hver for seg.",
  },
  {
    title: "Godkjenn",
    text: "Les gjennom, rett på det du vil, og godkjenn. Spott publiserer til tidene dere har valgt.",
  },
];

const progress = [
  { label: "Konto og bedrift", done: true },
  { label: "Merkevareprofil", done: true },
  { label: "Ukeplan med ferdige utkast", done: false },
  { label: "Publisering til Facebook, Instagram og LinkedIn", done: false },
  { label: "Tall som gjør neste uke bedre", done: false },
];

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
    text: `Spott leveres av ${company.legalName}. Vi selger ikke opplysningene dine videre.`,
  },
];

/** Punktum i overskrifter tegnes som prikken. Skjermlesere får et vanlig punktum. */
function Stop() {
  return (
    <>
      <span className="sr-only">.</span>
      <span aria-hidden className="ml-[0.05em] inline-block size-[0.21em] rounded-full bg-spot" />
    </>
  );
}

// Innloggede sendes videre til appen av proxyen (src/lib/supabase/proxy.ts),
// så forsiden er helt statisk.
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="overflow-hidden">
          <div className="mx-auto grid w-full max-w-6xl gap-14 px-6 pb-20 pt-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-10 lg:pb-28 lg:pt-14">
            <div>
              <h1 className="text-[clamp(2.25rem,11.2vw,4.5rem)] leading-[0.98] font-black tracking-[-0.03em] text-balance [word-spacing:0.04em] lg:text-[clamp(3.5rem,5.6vw,4.5rem)]">
                <span className="block">
                  Spott skriver ukas innlegg
                  <Stop />
                </span>
                <span className="block">
                  Du godkjenner
                  <Stop />
                </span>
              </h1>
              <p className="mt-7 max-w-[34rem] text-lg leading-relaxed text-ink-soft sm:text-xl">
                For små bedrifter uten markedsavdeling. Spott lærer hvordan dere høres ut, skriver
                innlegg til Facebook, Instagram og LinkedIn, og publiserer dem til riktig tid.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
                <Link
                  href="/login"
                  className="rounded-full bg-ink px-7 py-4 text-lg font-semibold text-paper"
                >
                  Opprett konto
                </Link>
                <a
                  href="#slik-virker-det"
                  className="rounded-sm text-lg font-semibold underline decoration-2 underline-offset-[6px]"
                >
                  Slik virker det
                </a>
              </div>
            </div>

            <div className="relative isolate">
              <div
                aria-hidden
                className="spot-in absolute top-1/2 left-[16%] -z-10 aspect-square w-[130%] max-w-[36rem] -translate-y-1/2 rounded-full bg-spot"
              />
              <WeekDemo />
            </div>
          </div>
        </section>

        <section id="slik-virker-det" className="on-dark scroll-mt-4 bg-ink text-paper">
          <div className="mx-auto w-full max-w-6xl px-6 py-20 lg:py-28">
            <h2 className="max-w-3xl text-4xl leading-[1.05] font-extrabold tracking-[-0.025em] text-balance sm:text-5xl">
              Fra nettside til publisert innlegg i tre steg
            </h2>
            <ol className="mt-14 grid gap-12 lg:grid-cols-3 lg:gap-10">
              {steps.map((step, index) => (
                <li key={step.title}>
                  <span
                    aria-hidden
                    className="flex size-12 items-center justify-center rounded-full bg-spot text-xl font-extrabold"
                  >
                    {index + 1}
                  </span>
                  <h3 className="mt-5 text-2xl font-bold tracking-tight">{step.title}</h3>
                  <p className="mt-2 max-w-sm leading-relaxed text-ink-muted">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section>
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:gap-16 lg:py-28">
            <div>
              <h2 className="text-4xl leading-[1.05] font-extrabold tracking-[-0.025em] text-balance sm:text-5xl">
                Spott er helt nytt
              </h2>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
                Vi bygger tjenesten steg for steg og sier fra om hva som virker i dag. Oppretter du
                konto nå, ligger merkevareprofilen klar den dagen ukeplanen kommer.
              </p>
            </div>
            <ul className="border-b border-line">
              {progress.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center gap-4 border-t border-line py-4 text-lg"
                >
                  <span
                    aria-hidden
                    className={
                      item.done
                        ? "size-4 shrink-0 rounded-full bg-spot"
                        : "size-4 shrink-0 rounded-full border-2 border-ink-soft"
                    }
                  />
                  <span className={item.done ? "flex-1 font-semibold" : "flex-1"}>{item.label}</span>
                  <span className={item.done ? "text-base font-bold" : "text-base text-ink-soft"}>
                    {item.done ? "Klart" : "Kommer"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-mist">
          <div className="mx-auto w-full max-w-6xl px-6 py-20 lg:py-28">
            <h2 className="text-4xl leading-[1.05] font-extrabold tracking-[-0.025em] text-balance sm:text-5xl">
              Du har kontrollen
            </h2>
            <ul className="mt-12 grid gap-10 lg:grid-cols-3 lg:gap-10">
              {promises.map((promise) => (
                <li key={promise.title} className="border-t-2 border-ink pt-5">
                  <h3 className="text-xl font-bold tracking-tight">{promise.title}</h3>
                  <p className="mt-2 max-w-sm leading-relaxed text-ink-soft">{promise.text}</p>
                </li>
              ))}
            </ul>
            <p className="mt-12">
              <Link
                href="/personvern"
                className="rounded-sm font-semibold underline decoration-2 underline-offset-[6px]"
              >
                Les personvernerklæringen
              </Link>
            </p>
          </div>
        </section>

        <section className="on-dark bg-spot text-paper">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-8 px-6 py-20 lg:flex-row lg:items-end lg:justify-between lg:py-24">
            <div>
              <h2 className="max-w-2xl text-4xl leading-[1.02] font-black tracking-[-0.03em] sm:text-6xl">
                Lag merkevare&shy;profilen i dag
              </h2>
              <p className="mt-5 max-w-lg text-lg leading-relaxed">
                Det tar et par minutter. Du trenger bare en e-postadresse og nettsiden til bedriften.
              </p>
            </div>
            <Link
              href="/login"
              className="shrink-0 rounded-full bg-paper px-7 py-4 text-lg font-semibold text-ink"
            >
              Opprett konto
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
