import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Wordmark } from "@/components/wordmark";
import { getAuth, getCurrentOrg } from "@/lib/auth";
import { signOut } from "./actions";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex min-w-0 items-center gap-8">
            <Link href="/dashboard" aria-label="Spott – dashboard" className="shrink-0 rounded-sm"><Wordmark className="text-2xl" /></Link>
            <nav aria-label="Hovedmeny" className="flex items-center gap-1 sm:gap-2">
              <Link href="/dashboard" className="rounded-full px-3 py-2 text-sm font-semibold text-ink hover:bg-mist">Oversikt</Link>
              <Link href="/profil" className="rounded-full px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-mist hover:text-ink">Merkevareprofil</Link>
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden max-w-48 truncate text-sm text-ink-soft sm:block"><Suspense fallback={null}><AccountLabel /></Suspense></span>
            <form action={signOut}><button type="submit" className="rounded-full border border-line px-4 py-2 text-sm font-semibold transition-colors hover:bg-white">Logg ut</button></form>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-5 py-8 sm:px-8 sm:py-10">{children}</main>
    </div>
  );
}

async function AccountLabel() {
  const auth = await getAuth();
  if (!auth) return null;
  const org = await getCurrentOrg();
  return <>{org?.name ?? auth.email}</>;
}
