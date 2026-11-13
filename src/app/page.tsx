import Link from "next/link";

const steps = [
  { title: "Legg inn nettsiden din", text: "Vi lager en merkevareprofil du kan rette på." },
  { title: "Få en ukeplan", text: "Ferdige utkast tilpasset Facebook, Instagram og LinkedIn." },
  { title: "Godkjenn", text: "Innleggene publiseres til riktig tid. Ingenting går ut uten deg." },
];

// Innloggede sendes videre til appen av proxyen (src/lib/supabase/proxy.ts),
// så denne siden kan være helt statisk.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">MyMarketing</h1>
        <p className="text-lg opacity-70">
          Markedsføring i sosiale medier for små bedrifter, skrevet av AI og godkjent av deg.
        </p>
      </header>
      <ol className="flex flex-col gap-3">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="flex gap-4 rounded-lg border border-black/10 p-4 dark:border-white/15"
          >
            <span aria-hidden className="font-mono text-sm opacity-70">
              {index + 1}
            </span>
            <div className="flex flex-col">
              <span className="font-medium">{step.title}</span>
              <span className="text-sm opacity-70">{step.text}</span>
            </div>
          </li>
        ))}
      </ol>
      <div>
        <Link
          href="/login"
          className="inline-block rounded-lg bg-foreground px-4 py-2.5 font-medium text-background"
        >
          Logg inn eller opprett konto
        </Link>
      </div>
    </main>
  );
}
