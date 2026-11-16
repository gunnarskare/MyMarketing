/**
 * Felles stiler for knapper og lenker, så de ser like ut overalt.
 * Handlingsknapper er dyp terrakotta med krem tekst (6,29:1), som merkevareprofilen sier (side 10).
 */
const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export const button = {
  /** Hovedhandlingen på en side. */
  primary: `${base} bg-terra-deep px-5 py-3 text-paper hover:bg-terra-deeper`,
  /** Andre handlinger. */
  secondary: `${base} border border-ink px-5 py-3 text-ink hover:bg-sand`,
  /** Lys knapp på terrakotta eller blekk. */
  light: `${base} bg-paper px-6 py-3.5 text-terra-deep hover:bg-sand`,
  /** Mindre utgaver, til kort og lister. */
  primarySmall: `${base} bg-terra-deep px-4 py-2.5 text-sm text-paper hover:bg-terra-deeper`,
  secondarySmall: `${base} border border-ink px-4 py-2.5 text-sm text-ink hover:bg-sand`,
  quietSmall: `${base} border border-line px-4 py-2.5 text-sm text-ink hover:border-ink`,
};

/** Lenker i løpende tekst. */
export const link = "font-semibold text-terra-deep underline decoration-1 underline-offset-4 hover:decoration-2";
