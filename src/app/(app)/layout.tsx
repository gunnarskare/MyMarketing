import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Wordmark } from "@/components/wordmark";
import { getAuth, getCurrentOrg } from "@/lib/auth";
import { signOut } from "./actions";
import { AppNav } from "./app-nav";

// Rammen er statisk. Det som leser innloggingen ligger bak Suspense og strømmes inn.
// Tilgangen sjekkes i proxyen og på nytt i hver side (requireUser / requireOrg).
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 pt-3 sm:flex-nowrap sm:px-8 sm:py-3">
          <Link href="/dashboard" className="shrink-0 rounded-sm">
            <Wordmark className="text-2xl" />
          </Link>
          <AppNav />
          <div className="flex shrink-0 items-center gap-3 sm:ml-auto">
            <span className="hidden max-w-48 truncate text-sm text-ink-soft lg:block">
              <Suspense fallback={null}>
                <AccountLabel />
              </Suspense>
            </span>
            <form action={signOut}>
              <button type="submit" className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-ink">
                Logg ut
              </button>
            </form>
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
