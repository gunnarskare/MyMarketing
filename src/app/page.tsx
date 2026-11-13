import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WeekDemo } from "@/components/week-demo";
import { company } from "@/lib/company";

const steps = [
  {
    number: "01",
    title: "Fortell hvem dere er",
    text: "Legg inn nettsiden og fortell hvordan bedriften skal høres ut. Spott bruker det som utgangspunkt for merkevareprofilen.",
  },
  {
    number: "02",
    title: "Få innhold klart",
    text: "Spott skal lage ferdige innlegg, tilpasset Facebook, Instagram og LinkedIn hver for seg.",
  },
  {
    number: "03",
    title: "Godkjenn med trygghet",
    text: "Les gjennom, gjør endringer og godkjenn. Planlagt publisering skal skje til tidene dere velger.",
  },
];

const progress = [
  { label: "Konto og bedriftsoppsett", done: true },
  { label: "Merkevareprofil", done: true },
  { label: "Ukeplan med ferdige utkast", done: false },
  { label: "Publisering til Facebook, Instagram og LinkedIn", done: false },
  { label: "Tall som gjør neste uke bedre", done: false },
];

const promises = [
  {
    title: "Du har siste ord",
    text: "Godkjenning skal være en naturlig del av arbeidsflyten. Innhold skal ikke publiseres uten at du har sagt ja.",
  },
  {
    title: "Personvern tas på alvor",
    text: "Bedriftsopplysninger lagres i EU. Vi samler inn det som trengs for å levere tjenesten.",
  },
  {
    title: "Et norsk selskap",
    text: `Spott leveres av ${company.legalName}. Vi selger ikke opplysningene dine videre.`,
  },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-xs font-bold tracking-[0.18em] text-spot-dark uppercase">
      <span aria-hidden className="size-2 rounded-full bg-spot" />
      {children}
    </p>
  );
}

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute -right-36 top-16 hidden size-[34rem] rounded-full border border-spot/15 lg:block" />
          <div aria-hidden className="pointer-events-none absolute -right-20 top-32 hidden size-[25rem] rounded-full border border-spot/20 lg:block" />
          <div className="mx-auto grid w-full max-w-7xl gap-14 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14 lg:px-10 lg:pb-32 lg:pt-20">
            <div className="relative z-10">
              <Eyebrow>EN ENKLERE HVERDAG MED MARKEDSFØRING</Eyebrow>
              <h1 className="mt-7 max-w-3xl text-[clamp(3.2rem,8vw,6.8rem)] leading-[0.91] font-semibold tracking-[-0.065em] text-balance">
                Du driver
                <br />
                bedriften<span className="font-editorial text-spot">.</span>
                <br />
                Vi tar oss av
                <br />
                synligheten<span className="font-editorial text-spot">.</span>
              </h1>
              <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-soft sm:text-xl">
                Spott hjelper små bedrifter med å holde seg synlige. Vi bygger en markedsføringsassistent
                som lærer bedriften å kjenne og gjør veien fra idé til publisert innlegg enklere.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  href="/login"
                  className="inline-flex min-h-14 items-center justify-center rounded-full bg-ink px-7 text-base font-semibold text-paper shadow-lg shadow-ink/10 transition-all hover:-translate-y-0.5 hover:bg-[#172747]"
                >
                  Opprett konto <span aria-hidden className="ml-3 text-lg text-spot">↗</span>
                </Link>
                <a
                  href="#slik-virker-det"
                  className="inline-flex min-h-14 items-center rounded-full px-5 text-base font-semibold text-ink transition-colors hover:bg-white"
                >
                  Slik fungerer det <span aria-hidden className="ml-2">↓</span>
                </a>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-6 text-sm text-ink-soft">
                <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-spot" /> Norsk tjeneste</span>
                <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-spot" /> Du beholder kontrollen</span>
                <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-spot" /> Bygget for små bedrifter</span>
              </div>
            </div>

            <div className="relative isolate mx-auto flex w-full max-w-xl items-center justify-center lg:justify-end">
              <div aria-hidden className="spot-in absolute left-1/2 top-1/2 -z-10 aspect-square w-[115%] max-w-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-spot" />
              <div aria-hidden className="absolute -right-3 -top-7 -z-10 size-24 rounded-full border border-paper/70" />
              <WeekDemo />
              <div className="absolute -bottom-7 -left-4 hidden rounded-2xl border border-line bg-paper px-5 py-4 shadow-xl shadow-ink/10 sm:block">
                <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Din bedrift. Din stemme.</p>
                <p className="mt-1 font-editorial text-2xl">Alltid gjenkjennelig<span className="text-spot">.</span></p>
              </div>
            </div>
          </div>
        </section>

        <section id="slik-virker-det" className="on-dark scroll-mt-6 bg-ink text-paper">
          <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <Eyebrow>SLIK FUNGERER SPOTT</Eyebrow>
                <h2 className="mt-5 max-w-xl text-4xl leading-[1.02] font-semibold tracking-[-0.045em] text-balance sm:text-5xl lg:text-6xl">
                  Fra bedriftens historie til innhold folk kjenner igjen<span className="font-editorial text-spot">.</span>
                </h2>
              </div>
              <p className="max-w-lg text-lg leading-relaxed text-ink-muted lg:justify-self-end">
                God markedsføring starter med å forstå hvem du er, hva du tilbyr og hvem du vil nå.
                Spott skal gjøre den jobben enklere – uten å ta stemmen fra bedriften.
              </p>
            </div>
            <ol className="mt-16 grid gap-10 border-t border-ink-line pt-8 md:grid-cols-3 md:gap-8">
              {steps.map((step) => (
                <li key={step.number} className="relative">
                  <span className="font-editorial text-5xl text-spot">{step.number}</span>
                  <h3 className="mt-6 text-2xl font-semibold tracking-tight">{step.title}</h3>
                  <p className="mt-3 max-w-sm leading-relaxed text-ink-muted">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20 lg:px-10 lg:py-28">
            <div>
              <Eyebrow>ÆRLIG OM STATUS</Eyebrow>
              <h2 className="mt-5 max-w-lg text-4xl leading-[1.02] font-semibold tracking-[-0.05em] text-balance sm:text-5xl">
                Vi bygger Spott – steg for steg<span className="font-editorial text-spot">.</span>
              </h2>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
                Spott er under utvikling. Konto og merkevareprofil er på plass, og resten av
                markedsføringsflyten bygges videre. Vi er åpne om hva som er klart og hva som kommer.
              </p>
              <Link href="/login" className="mt-8 inline-flex items-center gap-3 font-semibold underline decoration-2 underline-offset-4 transition-colors hover:text-spot-dark">
                Opprett konto <span aria-hidden>↗</span>
              </Link>
            </div>
            <div className="rounded-[1.5rem] border border-line bg-paper p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold">Produktstatus</p>
                <span className="rounded-full bg-spot/10 px-3 py-1 text-xs font-bold text-spot-dark">Under utvikling</span>
              </div>
              <ul className="mt-6">
                {progress.map((item, index) => (
                  <li key={item.label} className="flex items-center gap-4 border-t border-line py-4">
                    <span className={item.done ? "flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-paper" : "flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft"}>
                      {item.done ? <span aria-hidden>✓</span> : <span className="text-xs font-semibold">{String(index + 1).padStart(2, "0")}</span>}
                    </span>
                    <span className={item.done ? "flex-1 font-semibold" : "flex-1 text-ink-soft"}>{item.label}</span>
                    <span className={item.done ? "text-xs font-bold text-ok" : "text-xs text-ink-soft"}>{item.done ? "Klart" : "Kommer"}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="kontroll" className="bg-mist">
          <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
            <Eyebrow>TEKNOLOGI MED MENNESKET I SENTRUM</Eyebrow>
            <h2 className="mt-5 max-w-2xl text-4xl leading-[1.02] font-semibold tracking-[-0.05em] text-balance sm:text-5xl lg:text-6xl">
              Smart hjelp. Du har kontrollen<span className="font-editorial text-spot">.</span>
            </h2>
            <ul className="mt-14 grid gap-8 md:grid-cols-3 md:gap-10">
              {promises.map((promise, index) => (
                <li key={promise.title} className="border-t-2 border-ink pt-5">
                  <span className="font-editorial text-3xl text-spot">0{index + 1}</span>
                  <h3 className="mt-5 text-xl font-semibold tracking-tight">{promise.title}</h3>
                  <p className="mt-3 max-w-sm leading-relaxed text-ink-soft">{promise.text}</p>
                </li>
              ))}
            </ul>
            <p className="mt-12">
              <Link href="/personvern" className="font-semibold underline decoration-2 underline-offset-4">
                Les personvernerklæringen
              </Link>
            </p>
          </div>
        </section>

        <section className="relative overflow-hidden bg-spot text-paper">
          <div aria-hidden className="absolute -right-24 -top-40 size-[32rem] rounded-full border border-paper/20" />
          <div aria-hidden className="absolute -right-8 -top-24 size-[21rem] rounded-full border border-paper/20" />
          <div className="relative mx-auto flex w-full max-w-7xl flex-col items-start gap-10 px-5 py-20 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10 lg:py-24">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] uppercase text-paper/80">SPOTT · MARKEDSFØRING I BEDRE FLYT</p>
              <h2 className="mt-5 max-w-3xl text-5xl leading-[0.98] font-semibold tracking-[-0.055em] text-balance sm:text-6xl lg:text-7xl">
                Mer tid til bedriften. Mindre styr med markedsføringen<span className="font-editorial">.</span>
              </h2>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-paper/90">
                Opprett konto og bygg merkevareprofilen. Ukeplan og publisering kommer etter hvert som vi utvikler tjenesten.
              </p>
            </div>
            <Link href="/login" className="inline-flex min-h-14 shrink-0 items-center justify-center rounded-full bg-paper px-7 text-base font-semibold text-ink transition-all hover:-translate-y-0.5 hover:bg-white">
              Kom i gang <span aria-hidden className="ml-3 text-lg text-spot">↗</span>
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
