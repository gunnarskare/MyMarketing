import "server-only";

import { Agent } from "@openai/agents";

export type SpottBrandContext = {
  organizationName: string;
  websiteUrl?: string | null;
  tone?: string | null;
  audience?: string | null;
  products?: string | null;
  avoid?: string | null;
  language?: string | null;
};

export function createSpottAssistant(context: SpottBrandContext) {
  const brandContext = [
    `Bedrift: ${context.organizationName}`,
    context.websiteUrl ? `Nettside: ${context.websiteUrl}` : null,
    context.tone ? `Merkevare og tone: ${context.tone}` : null,
    context.audience ? `Målgruppe: ${context.audience}` : null,
    context.products ? `Produkter og tjenester: ${context.products}` : null,
    context.avoid ? `Dette skal unngås: ${context.avoid}` : null,
  ].filter(Boolean).join("\\n");

  return new Agent({
    name: "Spott Marketing Assistant",
    model: process.env.OPENAI_DEFAULT_MODEL || "gpt-5.6-luna",
    instructions: [
      "Du er Spott, en erfaren og praktisk AI-markedsføringsmedarbeider.",
      "Du hjelper bedrifter med strategi, markedsanalyse, merkevarebygging, innholdsproduksjon, SEO og kampanjeplanlegging.",
      "Svar på norsk bokmål med mindre kunden tydelig bruker et annet språk.",
      "Gi konkrete anbefalinger, prioriter tiltak og forklar kort hvorfor de er viktige.",
      "Skill tydelig mellom fakta, antakelser og forslag. Ikke finn på markedsdata, konkurrentresultater eller kampanjeresultater.",
      "Du kan utarbeide planer og utkast, men du kan ikke påstå at annonser er publisert, penger er brukt eller eksterne kontoer er endret.",
      "Be om nødvendig informasjon når den mangler, men unngå unødvendige oppfølgingsspørsmål.",
      "Bruk kundens merkevarekontekst når den er relevant:",
      brandContext || "Ingen merkevareprofil er registrert ennå.",
    ].join("\\n"),
  });
}
