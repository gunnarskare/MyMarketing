// Norske navn på kapitler og felt i merkevareanalysen. Brukes av redigeringen og i feilmeldinger.

export const SECTIONS = [
  ["brandOverview", "Bedriften"], ["positioning", "Posisjonering"], ["offerings", "Produkter og tjenester"],
  ["audiences", "Målgrupper"], ["brandPersonality", "Personlighet og verdier"], ["voiceAndTone", "Tone og språk"],
  ["messagingPillars", "Budskapspilarer"], ["visualIdentity", "Visuell identitet"], ["contentStrategy", "Innholdsstrategi"],
  ["seo", "Søkemotorer"], ["customerJourney", "Kundereisen"], ["strengths", "Styrker"], ["gaps", "Forbedringsområder"],
  ["opportunities", "Muligheter"], ["risks", "Risiko"], ["evidence", "Kildegrunnlag"], ["quality", "Kvalitet og sikkerhet"],
] as const;

export type SectionKey = (typeof SECTIONS)[number][0];

export const FIELD_LABELS: Record<string, string> = {
  oneLiner: "Kort fortalt", category: "Bransje", businessModel: "Forretningsmodell", mission: "Formål", vision: "Visjon",
  companyStage: "Selskapsfase", summary: "Sammendrag",
  positioningStatement: "Posisjonering i én setning", valueProposition: "Kundeløfte", customerProblem: "Kundens problem",
  promisedOutcome: "Resultatet kunden får", differentiators: "Det som skiller dere ut", proofPoints: "Dokumentasjon", alternatives: "Alternativer kunden har",
  name: "Navn", description: "Beskrivelse", targetAudience: "Målgruppe", customerBenefits: "Fordeler for kunden", features: "Egenskaper", evidence: "Dokumentasjon",
  segment: "Segment", needs: "Behov", painPoints: "Utfordringer", motivations: "Motivasjon", objections: "Innvendinger",
  decisionCriteria: "Det de velger etter", messagingAngle: "Vinkel i budskapet",
  traits: "Egenskaper", values: "Verdier", archetype: "Merkevarearketype", desiredPerception: "Slik vil dere oppfattes", avoidPerception: "Slik vil dere ikke oppfattes",
  voiceDescription: "Stemmen", toneAttributes: "Tone", writingPrinciples: "Skriveregler", preferredVocabulary: "Ord dere bruker",
  avoidVocabulary: "Ord dere unngår", sampleMessage: "Eksempel på budskap",
  pillar: "Pilar", coreMessage: "Kjernebudskap", supportingPoints: "Støttepunkter", proof: "Bevis",
  colorPalette: "Farger", typography: "Typografi", logoObservations: "Logo", imageryStyle: "Bildestil", designCharacteristics: "Designtrekk",
  themes: "Temaer", recommendedFormats: "Formater", relevantChannels: "Kanaler", callsToAction: "Oppfordringer til handling", editorialGuidelines: "Redaksjonelle regler",
  primaryTopics: "Hovedtemaer", keywordOpportunities: "Søkeord å satse på", searchIntents: "Hva folk søker etter",
  onPageObservations: "Innhold på sidene", technicalObservations: "Tekniske funn",
  stage: "Fase", customerQuestion: "Kundens spørsmål", contentNeed: "Innhold som trengs", recommendedAction: "Anbefalt tiltak",
  opportunity: "Mulighet", expectedImpact: "Forventet effekt", effort: "Innsats", priority: "Prioritet", firstStep: "Første steg",
  claim: "Påstand", sourceUrl: "Kilde", confidence: "Sikkerhet", assumptions: "Antakelser", missingInformation: "Mangler",
  questionsForCustomer: "Spørsmål til dere", completeness: "Fullstendighet", requiresHumanReview: "Bør gjennomgås",
};

/** Felt med faste valg, og de norske navnene på valgene. */
export const ENUM_FIELDS: Record<string, { value: string; label: string }[]> = {
  effort: [{ value: "low", label: "Lav" }, { value: "medium", label: "Middels" }, { value: "high", label: "Høy" }],
  priority: [{ value: "high", label: "Høy" }, { value: "medium", label: "Middels" }, { value: "low", label: "Lav" }],
  confidence: [{ value: "high", label: "Høy" }, { value: "medium", label: "Middels" }, { value: "low", label: "Lav" }],
};

export function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

export function sectionLabel(key: string): string {
  return SECTIONS.find(([k]) => k === key)?.[1] ?? fieldLabel(key);
}

/** «Innsats under Muligheter» fra en sti som ["opportunities", 0, "effort"]. */
export function describePath(path: readonly PropertyKey[]): string {
  const [section, ...rest] = path;
  const field = [...rest].reverse().find((part) => typeof part === "string");
  const sectionName = typeof section === "string" ? sectionLabel(section) : "analysen";
  return field ? `«${fieldLabel(String(field))}» under ${sectionName}` : `«${sectionName}»`;
}
