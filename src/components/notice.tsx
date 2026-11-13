import type { ReactNode } from "react";

/** Kort melding over et skjema. Rollen gjør at skjermlesere leser den opp. */
const STYLES = {
  info: "border-line bg-mist",
  success: "border-ok/40 bg-ok/10 text-ok",
  error: "border-spot/50 bg-spot/10",
};

export function Notice({ tone = "info", children }: { tone?: keyof typeof STYLES; children: ReactNode }) {
  const style = STYLES[tone];
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl border px-3.5 py-3 text-sm font-medium ${style}`}
    >
      {children}
    </p>
  );
}
