import type { ReactNode } from "react";

/** Kort melding over et skjema. Rollen gjør at skjermlesere leser den opp. */
const STYLES = {
  info: "border-line bg-sand",
  success: "border-ok/40 bg-ok/10 text-ok",
  error: "border-terra-deep/40 bg-terra-deep/10 text-terra-deep",
};

export function Notice({ tone = "info", children }: { tone?: keyof typeof STYLES; children: ReactNode }) {
  const style = STYLES[tone];
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border px-3.5 py-3 text-sm font-medium ${style}`}
    >
      {children}
    </p>
  );
}
