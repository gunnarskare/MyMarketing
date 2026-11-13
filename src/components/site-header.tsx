import Link from "next/link";
import { Wordmark } from "./wordmark";

export function SiteHeader() {
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between gap-5 px-5 py-5 sm:px-8 lg:px-10 lg:py-7">
      <Link href="/" aria-label="Spott – forsiden" className="rounded-sm">
        <Wordmark className="text-[2.35rem] sm:text-[2.7rem]" />
      </Link>

      <nav aria-label="Hovedmeny" className="flex items-center gap-3 sm:gap-7">
        <a
          href="/#slik-virker-det"
          className="hidden text-sm font-semibold text-ink-soft transition-colors hover:text-ink sm:inline"
        >
          Slik fungerer det
        </a>
        <a
          href="/#kontroll"
          className="hidden text-sm font-semibold text-ink-soft transition-colors hover:text-ink md:inline"
        >
          Hvorfor Spott
        </a>
        <Link
          href="/login"
          className="rounded-full px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-white sm:px-4"
        >
          Logg inn
        </Link>
        <Link
          href="/login"
          className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#172747] sm:px-6"
        >
          Kom i gang
        </Link>
      </nav>
    </header>
  );
}
