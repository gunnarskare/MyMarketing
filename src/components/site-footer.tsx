import Link from "next/link";
import { company } from "@/lib/company";
import { Wordmark } from "./wordmark";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-end md:justify-between lg:px-10">
        <div>
          <Wordmark className="text-3xl" />
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-soft">
            {company.product} er en tjeneste fra {company.legalName}, org.nr.{"\u00a0"}
            {company.orgNumber}.
            {company.address ? ` ${company.address}.` : null}
          </p>
          {company.email ? (
            <p className="mt-2 text-sm text-ink-soft">
              <a href={`mailto:${company.email}`} className="underline underline-offset-2">
                {company.email}
              </a>
            </p>
          ) : null}
        </div>
        <nav aria-label="Bunnmeny" className="flex gap-6 text-sm font-semibold">
          <Link className="transition-colors hover:text-spot-dark" href="/personvern">
            Personvern
          </Link>
          <Link className="transition-colors hover:text-spot-dark" href="/login">
            Logg inn
          </Link>
        </nav>
      </div>
      <div className="border-t border-line/80 px-5 py-4 text-center text-xs text-ink-soft sm:px-8 lg:px-10">
        © 2026 {company.legalName}. Laget for bedrifter med ting å gjøre.
      </div>
    </footer>
  );
}
