"use client";

import Image from "next/image";
import { Fragment, useId, useRef, useState, type KeyboardEvent } from "react";
import cabin from "@/images/fjordbygg-hytte.jpg";
import materials from "@/images/fjordbygg-materialvalg.jpg";
import team from "@/images/fjordbygg-team.jpg";
import { ExampleBrandCard, ExampleHeader, Swatches } from "./example-brand-card";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  CheckIcon,
  CompassIcon,
  CrosshairIcon,
  LayersIcon,
  LinkedInIcon,
  SendIcon,
} from "./icons";
import { button } from "./ui";

const STEPS = [
  {
    key: "kartlegg",
    label: "Kartlegg",
    Icon: CrosshairIcon,
    text: "Spyd leser nettsiden og henter logo, farger, fonter og bilder. Dere svarer på noen spørsmål om tilbudet, målgruppen og tonen.",
  },
  {
    key: "retning",
    label: "Velg retning",
    Icon: CompassIcon,
    text: "Spyd skriver en merkevareanalyse: hvem dere er, hvem dere snakker til og hva dere skal være kjent for. Dere retter det som ikke stemmer, og godkjenner.",
  },
  {
    key: "planlegg",
    label: "Planlegg og lag",
    Icon: LayersIcon,
    text: "Hver uke får dere en innholdsplan med ferdige utkast til Facebook, Instagram og LinkedIn, med forslag til dag, klokkeslett og bilde.",
  },
  {
    key: "publiser",
    label: "Publiser",
    Icon: SendIcon,
    text: "Les, rett og godkjenn. I dag kopierer du teksten og publiserer selv. Automatisk publisering til kontoene deres er under arbeid.",
  },
] as const;

/**
 * «Fra merkevare til publisering»: de fire stegene som faner, med et eksempel for hvert steg.
 * Faner på PC, liste på mobil. Piltastene flytter mellom stegene.
 */
export function Journey() {
  const [active, setActive] = useState(1);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const step = STEPS[active];

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = STEPS.length - 1;
    const next =
      event.key === "ArrowRight" || event.key === "ArrowDown" ? (index === last ? 0 : index + 1)
      : event.key === "ArrowLeft" || event.key === "ArrowUp" ? (index === 0 ? last : index - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  }

  return (
    <div>
      <div role="tablist" aria-label="Stegene i Spyd" className="flex flex-col border-t border-line lg:flex-row lg:items-end lg:border-t-0">
        {STEPS.map((item, index) => {
          const selected = index === active;
          return (
            <Fragment key={item.key}>
              {index > 0 ? <span aria-hidden="true" className="mb-16 hidden h-px flex-1 bg-line lg:block" /> : null}
              <button
                ref={(el) => { tabs.current[index] = el; }}
                type="button"
                role="tab"
                id={`${id}-fane-${item.key}`}
                aria-selected={selected}
                aria-controls={`${id}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(index)}
                onKeyDown={(event) => onKeyDown(event, index)}
                className={
                  "group flex items-center gap-4 border-b border-line py-4 text-left lg:flex-col lg:items-center lg:gap-3 lg:border-b-0 lg:px-4 lg:pt-0 lg:pb-0 " +
                  (selected ? "text-terra-deep" : "text-ink hover:text-terra-deep")
                }
              >
                <item.Icon className="size-8 shrink-0 text-terra-deep lg:size-10" />
                <span
                  className={
                    "flex-1 text-lg lg:flex-none lg:border-b-[3px] lg:pb-3 lg:font-serif lg:text-[1.75rem] lg:leading-tight " +
                    (selected ? "font-semibold lg:border-terra-deep lg:font-normal" : "lg:border-transparent")
                  }
                >
                  {item.label}
                </span>
                <ArrowRightIcon className={"size-5 shrink-0 transition-transform lg:hidden " + (selected ? "rotate-90" : "")} />
              </button>
            </Fragment>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-fane-${step.key}`}
        tabIndex={0}
        className="mt-8 grid gap-8 rounded-sm lg:mt-12 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-10"
      >
        <div className="flex flex-col gap-6">
          <p className="text-lg leading-relaxed text-ink-soft">{step.text}</p>
          {step.key === "kartlegg" ? <MappedCard />
            : step.key === "retning" ? <ExampleBrandCard />
            : step.key === "planlegg" ? <PlanCard />
            : <PublishCard />}
        </div>
        <div className="relative hidden min-h-[30rem] overflow-hidden rounded-xl lg:block">
          <Image src={cabin} alt="" fill sizes="(min-width: 1024px) 44rem, 0px" placeholder="blur" className="object-cover" />
        </div>
      </div>
    </div>
  );
}

const cardClass = "rounded-xl border border-line bg-paper p-5 shadow-[0_24px_48px_-28px_rgb(43_33_29/0.45)]";

function MappedCard() {
  return (
    <div className={cardClass}>
      <ExampleHeader />
      <p className="mt-4 font-serif text-[1.75rem] leading-tight">Nettsiden er lest</p>
      <p className="mt-1 text-sm text-ink-soft">fjordbygg.no</p>
      <ul className="mt-4 flex flex-col gap-2.5">
        {["Fire sider: forside, prosjekter, om oss og kontakt", "Logo og fire farger", "Tolv bilder lagt i biblioteket"].map((item) => (
          <li key={item} className="flex items-start gap-3">
            <CheckIcon className="mt-0.5 size-5 shrink-0 text-ok" />
            {item}
          </li>
        ))}
      </ul>
      <Swatches className="mt-5" />
    </div>
  );
}

const PLAN = [
  { day: "Ons", date: "11. juni", title: "Materialvalg", image: materials },
  { day: "Tor", date: "12. juni", title: "Prosjekt i skjærgården", image: cabin },
  { day: "Fre", date: "13. juni", title: "Møt teamet", image: team },
];

function PlanCard() {
  return (
    <div className={cardClass}>
      <ExampleHeader />
      <p className="mt-4 font-serif text-[1.75rem] leading-tight">Uke 24</p>
      <p className="mt-1 text-sm text-ink-soft">9.–15. juni</p>
      <ul className="mt-4 flex flex-col divide-y divide-line border-y border-line">
        {PLAN.map((item) => (
          <li key={item.title} className="flex items-center gap-4 py-3">
            <span className="w-14 shrink-0">
              <span className="block font-serif text-lg leading-none">{item.day}</span>
              <span className="mt-1 block text-xs text-ink-soft">{item.date}</span>
            </span>
            <Image src={item.image} alt="" sizes="80px" className="h-12 w-[4.5rem] shrink-0 rounded-md object-cover" />
            <span className="min-w-0">
              <span className="block truncate font-serif text-lg leading-tight">{item.title}</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-soft">
                <LinkedInIcon className="size-4" /> LinkedIn
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PublishCard() {
  const [approved, setApproved] = useState(false);
  return (
    <div className={cardClass}>
      <ExampleHeader />
      <p className="mt-4 font-serif text-[1.75rem] leading-tight">Prosjekt i skjærgården</p>
      <p className="mt-2 inline-flex items-center gap-2 rounded-md bg-sand px-2.5 py-1 text-sm font-semibold" role="status">
        <CheckCircleIcon className={"size-5 " + (approved ? "text-ok" : "text-ink-soft")} />
        {approved ? "Godkjent" : "Klar til godkjenning"}
      </p>
      <div className="mt-4 overflow-hidden rounded-lg border border-line">
        <p className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
          <span className="flex items-center gap-2 font-semibold"><LinkedInIcon className="size-5" /> LinkedIn</span>
          <span className="text-ink-soft">Forhåndsvisning</span>
        </p>
        <Image src={cabin} alt="" sizes="(min-width: 1024px) 24rem, 100vw" className="aspect-[16/10] w-full object-cover" />
        <p className="px-3 py-3 text-sm leading-relaxed">
          Nytt prosjekt i skjærgården – en moderne og varig fritidsbolig med nærhet til naturen, bygget for generasjoner.
        </p>
      </div>
      <p className="mt-3 text-sm text-ink-soft">Planlagt torsdag 12. juni kl. 10:00</p>
      <button
        type="button"
        onClick={() => setApproved((value) => !value)}
        className={`${button.primary} mt-4 w-full`}
      >
        <CheckIcon className="size-5" />
        {approved ? "Angre godkjenning" : "Godkjenn innlegg"}
        <span className="sr-only"> (eksempel, ingenting lagres)</span>
      </button>
    </div>
  );
}
