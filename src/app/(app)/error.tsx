"use client";

import { useEffect } from "react";
import { button } from "@/components/ui";

/** Vises inne i appen hvis en side feiler. Menyen blir stående, så brukeren kommer seg videre. */
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="flex max-w-xl flex-col gap-4 rounded-xl border border-line bg-paper p-6 sm:p-8" role="alert">
      <h1 className="font-serif text-3xl tracking-[-0.01em]">Siden kunne ikke vises</h1>
      <p className="text-ink-soft">Noe gikk galt hos oss. Det du har lagret, er trygt. Prøv igjen, eller gå til en annen side i menyen.</p>
      <div>
        <button type="button" onClick={() => retry()} className={button.primary}>Prøv igjen</button>
      </div>
    </section>
  );
}
