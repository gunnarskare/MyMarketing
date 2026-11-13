import Link from "next/link";
import { company } from "@/lib/company";
import { Wordmark } from "./wordmark";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Wordmark className="text-2xl" />
          <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
            {company.product} er en tjeneste fra {company.legalName}, org.nr.{"\u00a0"}{company.orgNumber}.
            {company.address ? ` ${company.address}.` : null}
          </p>
          {company.email ? (
            <p className="mt-1 text-sm text-ink-soft">
              <a href={`mailto:${company.email}`} className="underline underline-offset-2">
                {company.email}
              </a>
            </p>
          ) : null}
        </div>
        <nav aria-label="Bunnmeny" className="flex gap-6 text-sm font-semibold">
          <Link href="/personvern">Personvern</Link>
          <Link href="/login">Logg inn</Link>
        </nav>
      </div>
    </footer>
  );
}
