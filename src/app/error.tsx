"use client";

import { useEffect } from "react";

/** Vises hvis en side utenfor appen (forsiden, innlogging) feiler. */
export default function PageError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-5 px-6 py-16" role="alert">
      <h1 className="text-3xl font-extrabold tracking-tight">Siden kunne ikke vises</h1>
      <p className="text-ink-soft">Noe gikk galt hos oss. Prøv igjen om litt.</p>
      <div>
        <button type="button" onClick={() => retry()} className="rounded-full bg-ink px-5 py-3 font-semibold text-paper">Prøv igjen</button>
      </div>
    </main>
  );
}
