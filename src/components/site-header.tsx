import Link from "next/link";
import { Wordmark } from "./wordmark";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-5">
      <Link href="/" className="rounded-sm">
        <Wordmark className="text-3xl" />
      </Link>
      <nav aria-label="Konto" className="flex items-center gap-2">
        <Link href="/login" className="rounded-full px-3 py-2 font-semibold">
          Logg inn
        </Link>
        <Link
          href="/login"
          className="hidden rounded-full bg-ink px-5 py-2.5 font-semibold text-paper sm:inline-block"
        >
          Opprett konto
        </Link>
      </nav>
    </header>
  );
}
