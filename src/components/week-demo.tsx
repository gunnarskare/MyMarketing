"use client";

import { useState } from "react";

const DAYS = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

const DRAFTS = [
  {
    day: 0,
    when: "Mandag kl. 07.30",
    platform: "Facebook",
    text: "Ferske kanelsnurrer fra klokka sju i morgen. Kom tidlig, de pleier å være borte før ni.",
  },
  {
    day: 2,
    when: "Onsdag kl. 11.00",
    platform: "Instagram",
    text: "Ukas brød er surdeig med havre og honning. Bakt i natt, i hylla nå.",
  },
  {
    day: 4,
    when: "Fredag kl. 09.00",
    platform: "LinkedIn",
    text: "Vi leverer lunsj til møter i sentrum. Bestill innen klokka 14 dagen før, så står den klar.",
  },
];

/**
 * Forsidens eksempel: tre utkast for en uke, som besøkende kan godkjenne.
 * Viser kjernen i Spott uten å love mer enn tjenesten gjør. Ingenting lagres.
 */
export function WeekDemo() {
  const [approved, setApproved] = useState<number[]>([]);
  const allApproved = approved.length === DRAFTS.length;

  return (
    <section
      aria-label="Eksempel på ukas innlegg"
      className="relative w-full max-w-md rounded-3xl border border-line bg-paper p-5 shadow-[0_30px_60px_-30px_rgb(16_27_59/0.5)] sm:p-6"
    >
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-lg font-extrabold tracking-tight">Ukas innlegg</p>
        <p className="text-sm text-ink-soft">Eksempel: et bakeri</p>
      </div>

      <ol aria-hidden className="mt-4 grid grid-cols-7 text-center">
        {DAYS.map((day, index) => {
          const hasDraft = DRAFTS.some((draft) => draft.day === index);
          const isApproved = approved.includes(index);
          return (
            <li key={day} className="flex flex-col items-center gap-2">
              <span className="text-xs font-semibold text-ink-soft">{day}</span>
              <span className="flex size-5 items-center justify-center">
                <span
                  className={
                    isApproved
                      ? "size-5 rounded-full bg-spot transition-all duration-300"
                      : hasDraft
                        ? "size-5 rounded-full border-2 border-spot transition-all duration-300"
                        : "size-1.5 rounded-full bg-line"
                  }
                />
              </span>
            </li>
          );
        })}
      </ol>

      <ul className="mt-5 flex flex-col">
        {DRAFTS.map((draft) => {
          const isApproved = approved.includes(draft.day);
          return (
            <li key={draft.day} className="border-t border-line py-4">
              <p className="text-sm font-bold">
                {draft.platform}
                <span className="font-medium text-ink-soft">, {draft.when.toLowerCase()}</span>
              </p>
              <p className="mt-1.5 leading-snug">{draft.text}</p>
              <div className="mt-3 flex min-h-9 items-center">
                {isApproved ? (
                  <p className="flex items-center gap-2 text-sm font-bold text-ok">
                    <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none">
                      <path
                        d="M3 8.5l3.2 3.2L13 4.8"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Godkjent
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setApproved((current) => [...current, draft.day])}
                    className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper"
                  >
                    Godkjenn
                    <span className="sr-only"> innlegget til {draft.platform}</span>
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex min-h-11 items-center justify-between gap-4 border-t border-line pt-4">
        <p role="status" className="text-sm font-semibold">
          {allApproved
            ? "Uka er klar. Slik er en uke med Spott."
            : approved.length === 0
              ? "Prøv selv: godkjenn innleggene."
              : `${approved.length} av ${DRAFTS.length} godkjent`}
        </p>
        {allApproved ? (
          <button
            type="button"
            onClick={() => setApproved([])}
            className="rounded-sm text-sm font-semibold underline underline-offset-4"
          >
            Start på nytt
          </button>
        ) : null}
      </div>
    </section>
  );
}
