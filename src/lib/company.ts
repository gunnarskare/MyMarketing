/**
 * Hvem som står bak tjenesten. Brukes i bunnteksten og personvernerklæringen.
 * E-post og adresse vises bare når de er fylt inn.
 */
export const company: {
  product: string;
  legalName: string;
  orgNumber: string;
  email: string | null;
  address: string | null;
} = {
  product: "Spott",
  legalName: "S&S Marketing AS",
  // Harde mellomrom, så nummeret ikke deles over to linjer.
  orgNumber: "930\u00a0641\u00a0340",
  email: "hei@spott.no",
  address: null,
};
