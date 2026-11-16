import type { Metadata } from "next";
import Link from "next/link";
import { button } from "@/components/ui";
import { Wordmark } from "@/components/wordmark";

export const metadata: Metadata = { title: "Fant ikke siden" };

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <Link href="/" className="self-start rounded-sm"><Wordmark className="h-11 w-auto" /></Link>
      <h1 className="font-serif text-4xl tracking-[-0.01em]">Fant ikke siden</h1>
      <p className="text-ink-soft">Adressen finnes ikke, eller siden er flyttet.</p>
      <Link href="/dashboard" className={`${button.primary} self-start`}>Gå til oversikten</Link>
    </main>
  );
}
