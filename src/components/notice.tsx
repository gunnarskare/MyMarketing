import type { ReactNode } from "react";

/** Kort melding over et skjema. role="status" gjør at skjermlesere leser den opp. */
export function Notice({ tone = "info", children }: { tone?: "info" | "error"; children: ReactNode }) {
  const style =
    tone === "error"
      ? "border-red-600/40 bg-red-600/10"
      : "border-black/15 bg-black/5 dark:border-white/20 dark:bg-white/10";
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-lg border px-3 py-2.5 text-sm ${style}`}>
      {children}
    </p>
  );
}
