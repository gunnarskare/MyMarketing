const phases = [
  { name: "0. Grunnmur", detail: "Prosjekt, datamodell og adapter-grensesnitt", done: true },
  { name: "1. AI uten publisering", detail: "Merkevareprofil, ukeplan og utkast", done: false },
  { name: "2. Første publisering", detail: "Facebook-side og LinkedIn", done: false },
  { name: "3. Planlegging", detail: "Godkjenning, kø og jobbkjører", done: false },
  { name: "4. Instagram og bilder", detail: "Bildeopplasting og AI-bilde", done: false },
  { name: "5. Tall og pilot", detail: "Tall per innlegg og første pilotkunde", done: false },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">MyMarketing</h1>
        <p className="text-base opacity-70">
          AI-markedsføring for små bedrifter. Under bygging.
        </p>
      </header>
      <ol className="flex flex-col gap-3">
        {phases.map((phase) => (
          <li
            key={phase.name}
            className="flex items-start gap-3 rounded-lg border border-black/10 p-4 dark:border-white/15"
          >
            <span aria-hidden className="mt-0.5 font-mono text-sm">
              {phase.done ? "[x]" : "[ ]"}
            </span>
            <div className="flex flex-col">
              <span className="font-medium">
                {phase.name}
                <span className="sr-only">{phase.done ? " (ferdig)" : " (gjenstår)"}</span>
              </span>
              <span className="text-sm opacity-70">{phase.detail}</span>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
