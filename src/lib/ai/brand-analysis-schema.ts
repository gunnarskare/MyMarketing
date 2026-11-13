import { z } from "zod";
const strings = z.array(z.string());
export const brandAnalysisSchema = z.object({
  brandOverview: z.object({ oneLiner:z.string(), category:z.string(), businessModel:z.string(), mission:z.string(), vision:z.string(), companyStage:z.string(), summary:z.string() }),
  positioning: z.object({ positioningStatement:z.string(), valueProposition:z.string(), customerProblem:z.string(), promisedOutcome:z.string(), differentiators:strings, proofPoints:strings, alternatives:strings }),
  offerings: z.array(z.object({ name:z.string(), description:z.string(), targetAudience:strings, customerBenefits:strings, features:strings, evidence:strings })),
  audiences: z.array(z.object({ segment:z.string(), needs:strings, painPoints:strings, motivations:strings, objections:strings, decisionCriteria:strings, messagingAngle:z.string() })),
  brandPersonality: z.object({ traits:strings, values:strings, archetype:z.string(), desiredPerception:strings, avoidPerception:strings }),
  voiceAndTone: z.object({ voiceDescription:z.string(), toneAttributes:strings, writingPrinciples:strings, preferredVocabulary:strings, avoidVocabulary:strings, sampleMessage:z.string() }),
  messagingPillars: z.array(z.object({ pillar:z.string(), coreMessage:z.string(), supportingPoints:strings, proof:strings })),
  visualIdentity: z.object({ colorPalette:strings, typography:strings, logoObservations:strings, imageryStyle:strings, designCharacteristics:strings }),
  contentStrategy: z.object({ themes:strings, recommendedFormats:strings, relevantChannels:strings, callsToAction:strings, editorialGuidelines:strings }),
  seo: z.object({ primaryTopics:strings, keywordOpportunities:strings, searchIntents:strings, onPageObservations:strings, technicalObservations:strings }),
  customerJourney: z.array(z.object({ stage:z.string(), customerQuestion:z.string(), contentNeed:z.string(), recommendedAction:z.string() })),
  strengths:strings, gaps:strings,
  opportunities:z.array(z.object({ opportunity:z.string(), expectedImpact:z.string(), effort:z.enum(["low","medium","high"]), priority:z.enum(["high","medium","low"]), firstStep:z.string() })),
  risks:strings,
  evidence:z.array(z.object({ claim:z.string(), sourceUrl:z.string().nullable(), evidence:z.string(), confidence:z.enum(["high","medium","low"]) })),
  quality:z.object({ confidence:z.enum(["high","medium","low"]), completeness:z.number().min(0).max(100), assumptions:strings, missingInformation:strings, questionsForCustomer:strings, requiresHumanReview:z.boolean() })
});
export type BrandAnalysis = z.infer<typeof brandAnalysisSchema>;
