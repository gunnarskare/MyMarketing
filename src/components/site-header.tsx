import Link from "next/link";
import { SiteMenu } from "./site-menu";
import { button } from "./ui";
import { Wordmark } from "./wordmark";

/** Lenkene i toppmenyen. De peker til delene av forsiden, så de virker fra alle sider. */
export const SITE_LINKS = [
  { href: "/#plattformen", label: "Plattformen" },
  { href: "/#markedsforere", label: "Markedsførere" },
  { href: "/#pris", label: "Priser" },
];

export function SiteHeader() {
  return (
    <header className="relative z-30 border-b border-line bg-paper">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="shrink-0 rounded-sm">
          <Wordmark className="h-11 w-auto" />
        </Link>
        <nav aria-label="Hovedmeny" className="hidden lg:block">
          <ul className="flex items-center gap-9">
            {SITE_LINKS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="rounded-sm font-semibold text-ink hover:text-terra-deep">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden items-center gap-6 lg:flex">
          <Link href="/login" className="rounded-sm font-semibold text-ink hover:text-terra-deep">
            Logg inn
          </Link>
          <Link href="/login" className={button.primary}>
            Lag merkevareprofil
          </Link>
        </div>
        <SiteMenu links={SITE_LINKS} />
      </div>
    </header>
  );
}
