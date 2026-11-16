import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { LogOutIcon } from "@/components/icons";
import { Wordmark } from "@/components/wordmark";
import { getAuth, getCurrentOrg } from "@/lib/auth";
import { signOut } from "./actions";
import { AppNav } from "./app-nav";

// Rammen er statisk. Det som leser innloggingen ligger bak Suspense og strømmes inn.
// Tilgangen sjekkes i proxyen og på nytt i hver side (requireUser / requireOrg).
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-10 border-r border-line bg-paper px-4 py-7 lg:flex">
        <Link href="/dashboard" className="self-start rounded-sm px-3">
          <Wordmark className="h-11 w-auto" />
        </Link>
        <AppNav variant="sidebar" />
        <div className="mt-auto flex flex-col gap-3 border-t border-line px-3 pt-5">
          <p className="truncate text-sm text-ink-soft">
            <Suspense fallback={null}>
              <AccountLabel />
            </Suspense>
          </p>
          <SignOutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-4 px-5 pt-4 pb-3 sm:px-8">
            <Link href="/dashboard" className="shrink-0 rounded-sm">
              <Wordmark className="h-11 w-auto" />
            </Link>
            <SignOutButton />
          </div>
          <div className="px-5 sm:px-8">
            <AppNav variant="bar" />
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-14">
          {children}
        </main>
      </div>
    </div>
  );
}

function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-sm font-semibold hover:border-ink"
      >
        <LogOutIcon className="size-4" />
        Logg ut
      </button>
    </form>
  );
}

async function AccountLabel() {
  const auth = await getAuth();
  if (!auth) return null;
  const org = await getCurrentOrg();
  return <>{org?.name ?? auth.email}</>;
}
