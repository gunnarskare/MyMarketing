import type { ReactNode } from "react";

/** Kort melding over et skjema. Rollen gjør at skjermlesere leser den opp. */
export function Notice({ tone = "info", children }: { tone?: "info" | "error"; children: ReactNode }) {
  const style = tone === "error" ? "border-spot/50 bg-spot/10" : "border-line bg-mist";
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl border px-3.5 py-3 text-sm font-medium ${style}`}
    >
      {children}
    </p>
  );
}
