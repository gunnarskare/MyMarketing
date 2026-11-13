import { normalizeTypography, type TypographySettings } from "@/lib/typography";

const ROLE_GUIDANCE = {
  heading: "Use for H1-H6, page titles, and section headings.",
  body: "Use for paragraphs, captions, navigation, forms, and interface copy.",
  display: "Use sparingly for oversized campaign headlines and expressive display text.",
  button: "Use for buttons, calls to action, and short labels.",
} as const;

/**
 * Append this block to every content-generation system prompt.
 * The AI receives role-specific font constraints instead of inventing a new type system.
 */
export function buildTypographyDesignInstructions(rawSettings: unknown): string {
  const settings: TypographySettings = normalizeTypography(rawSettings);
  const lines = Object.entries(settings).map(([role, assignment]) => {
    const guidance = ROLE_GUIDANCE[role as keyof typeof ROLE_GUIDANCE];
    const weights = assignment.weights.length ? assignment.weights.join(", ") : "400, 500, 700";
    return `- ${role}: ${assignment.family}; source=${assignment.source}; allowed weights=${weights}. ${guidance}`;
  });
  return [
    "BRAND TYPOGRAPHY — REQUIRED DESIGN CONSTRAINTS",
    "Use the company's approved typography roles below in every generated page, ad, social post, and marketing asset.",
    ...lines,
    "Do not substitute, invent, or add font families. If a requested design cannot be achieved with these fonts, preserve the closest approved role and ask for approval before changing the brand typography.",
    "Keep typography consistent across all deliverables for this organization. Use the assigned role for each text element; do not use display fonts for long body copy.",
    "When returning HTML/CSS, define reusable CSS variables or tokens for these role assignments rather than hard-coding unrelated font stacks.",
  ].join("\\n");
}
