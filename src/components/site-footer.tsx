import Link from "next/link";
import { company } from "@/lib/company";
import { Wordmark } from "./wordmark";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Wordmark className="h-11 w-auto" />
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-soft">
            {company.product} er en tjeneste fra {company.legalName}, org.nr.{" "}{company.orgNumber}.
            {company.address ? ` ${company.address}.` : null}
          </p>
          {company.email ? (
            <p className="mt-1 text-sm">
              <a href={`mailto:${company.email}`} className="font-semibold text-terra-deep underline underline-offset-2">
                {company.email}
              </a>
            </p>
          ) : null}
        </div>
        <nav aria-label="Bunnmeny">
          <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold">
            <li><Link href="/vilkar" className="hover:text-terra-deep">Vilkår</Link></li>
            <li><Link href="/personvern" className="hover:text-terra-deep">Personvern</Link></li>
            <li><Link href="/sletting" className="hover:text-terra-deep">Slett data</Link></li>
            <li><Link href="/login" className="hover:text-terra-deep">Logg inn</Link></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
