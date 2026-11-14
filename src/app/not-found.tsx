import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export const metadata: Metadata = { title: "Fant ikke siden" };

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <Link href="/" className="self-start rounded-sm"><Wordmark className="text-3xl" /></Link>
      <h1 className="text-3xl font-extrabold tracking-tight">Fant ikke siden</h1>
      <p className="text-ink-soft">Adressen finnes ikke, eller siden er flyttet.</p>
      <Link href="/dashboard" className="self-start rounded-full bg-ink px-5 py-3 font-semibold text-paper">Gå til oversikten</Link>
    </main>
  );
}
