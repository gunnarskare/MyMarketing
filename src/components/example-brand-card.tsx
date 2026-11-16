import { CalendarIcon, HouseIcon } from "./icons";

/**
 * Eksempelbedriften på forsiden. Fjordbygg finnes ikke: kortet viser hvordan en merkevareprofil ser ut i Spyd.
 * Fargene er Fjordbyggs egne, ikke Spyds.
 */
export const FJORDBYGG_COLORS = [
  { hex: "#3d5235", name: "Granskog" },
  { hex: "#e5ddd0", name: "Lys stein" },
  { hex: "#d8b99a", name: "Furu" },
  { hex: "#3b2a25", name: "Tjære" },
];

export function ExampleBadge() {
  return (
    <span className="rounded-md bg-sand px-2 py-0.5 text-xs font-semibold text-ink-soft">Eksempel</span>
  );
}

export function ExampleHeader() {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="flex items-center gap-2.5 font-serif text-xl text-ink">
        <HouseIcon className="size-7 text-terra-deep" />
        Fjordbygg
      </p>
      <ExampleBadge />
    </div>
  );
}

export function Swatches({ className = "" }: { className?: string }) {
  return (
    <ul className={`grid grid-cols-4 gap-2.5 ${className}`}>
      {FJORDBYGG_COLORS.map((color) => (
        <li key={color.hex}>
          <span
            className="block h-11 rounded-md ring-1 ring-ink/10 ring-inset"
            style={{ backgroundColor: color.hex }}
          />
          <span className="sr-only">{color.name}</span>
        </li>
      ))}
    </ul>
  );
}

/** Merkevareprofilen til Fjordbygg. compact viser bare navn og farger, som over bildet på forsiden. */
export function ExampleBrandCard({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  return (
    <div className={`rounded-xl border border-line bg-paper p-5 text-ink shadow-[0_24px_48px_-28px_rgb(43_33_29/0.45)] ${className}`}>
      <ExampleHeader />
      <p className="mt-4 font-serif text-[1.75rem] leading-tight">Merkevareprofil</p>
      {compact ? null : (
        <p className="mt-2 leading-relaxed text-ink-soft">
          En moderne og trygg boligbygger som skaper bærekraftige hjem i samspill med norsk natur.
        </p>
      )}
      <Swatches className="mt-4" />
      {compact ? null : (
        <>
          <p className="mt-6 border-t border-line pt-5 font-serif text-xl">Anbefalt innhold</p>
          <ul className="mt-3 flex flex-col gap-2">
            {["Inspirasjon fra kysten", "Slik bygger vi bærekraftig", "Prosjekt: Hytte i skjærgården"].map((item) => (
              <li key={item} className="flex items-center gap-3 rounded-lg bg-sand px-3 py-2.5 text-sm">
                <CalendarIcon className="size-5 shrink-0 text-terra-deep" />
                {item}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
