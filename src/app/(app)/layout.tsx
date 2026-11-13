import { Suspense, type ReactNode } from "react";
import { Wordmark } from "@/components/wordmark";
import { getAuth, getCurrentOrg } from "@/lib/auth";
import { signOut } from "./actions";

// Rammen er statisk. Det som leser innloggingen ligger bak Suspense og strømmes inn.
// Tilgangen sjekkes i proxyen og på nytt i hver side (requireUser / requireOrg).
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex min-w-0 flex-col">
            <Wordmark className="text-2xl" />
            <span className="min-h-5 truncate text-sm text-ink-soft">
              <Suspense fallback={null}>
                <AccountLabel />
              </Suspense>
            </span>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-full border border-ink px-4 py-2 text-sm font-semibold"
            >
              Logg ut
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">{children}</main>
    </>
  );
}

async function AccountLabel() {
  const auth = await getAuth();
  if (!auth) return null;
  const org = await getCurrentOrg();
  return <>{org?.name ?? auth.email}</>;
}
