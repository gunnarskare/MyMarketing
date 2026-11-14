// Uker, datoer og klokkeslett i norsk tid, og rydding av AI-forslag til innlegg.
// Ingen importer, så filen kan testes direkte med Node (tests/unit).

export const PLATFORMS = ["facebook", "instagram", "linkedin"] as const;
export type Platform = (typeof PLATFORMS)[number];
export const PLATFORM_LABEL: Record<Platform, string> = { facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn" };

export const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
export type Day = (typeof DAYS)[number];
export const DAY_LABEL: Record<Day, string> = {
  monday: "mandag", tuesday: "tirsdag", wednesday: "onsdag", thursday: "torsdag", friday: "fredag", saturday: "lørdag", sunday: "søndag",
};

const TZ = "Europe/Oslo";

/** Dato og klokkeslett i Oslo for et tidspunkt. */
export function osloParts(instant: Date): { date: string; time: string; weekday: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts.weekday);
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}`, weekday };
}

function offsetMinutes(utcMs: number): number {
  const p = osloParts(new Date(utcMs));
  const [y, m, d] = p.date.split("-").map(Number);
  const [h, mi] = p.time.split(":").map(Number);
  return Math.round((Date.UTC(y, m - 1, d, h, mi) - Math.floor(utcMs / 60000) * 60000) / 60000);
}

/** Norsk dato og klokkeslett («2026-11-16», «07:30») som UTC-tidspunkt. Tar hensyn til sommertid. */
export function osloToUtc(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let result = guess - offsetMinutes(guess) * 60000;
  result = guess - offsetMinutes(result) * 60000;
  return new Date(result);
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Mandagen i uka for en dato. */
export function mondayOf(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  return addDays(date, -weekday);
}

/** ISO-ukenummer. */
export function isoWeek(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + 3 - ((t.getUTCDay() + 6) % 7));
  const firstThursday = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((t.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

export type WeekChoice = "this" | "next";

/** Uka det skal planlegges for, og hvilke dager som fortsatt er igjen (i dag regnes med hvis det er før kl. 18). */
export function planningWeek(choice: WeekChoice, now = new Date()): { start: string; end: string; days: { day: Day; date: string }[] } {
  const today = osloParts(now);
  const start = choice === "this" ? mondayOf(today.date) : addDays(mondayOf(today.date), 7);
  const days = DAYS.map((day, i) => ({ day, date: addDays(start, i) }))
    .filter(({ date }) => date > today.date || (date === today.date && today.time < "18:00"));
  return { start, end: addDays(start, 6), days };
}

export type DraftPost = {
  day: string; time: string; platform: string; topic: string; pillar: string;
  text: string; hashtags: string[]; imageIdea: string; imageAssetId: string | null;
};

export type CleanPost = {
  date: string; time: string; platform: Platform; topic: string; pillar: string;
  text: string; hashtags: string[]; imageIdea: string; assetId: string | null;
};

const MAX_TEXT = 3000;

export function normalizeHashtags(tags: string[], max = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = "#" + raw.trim().replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, "");
    if (tag.length < 2 || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    out.push(tag);
    if (out.length >= max) break;
  }
  return out;
}

export function normalizeTime(raw: string, fallback = "09:00"): string {
  const match = raw.trim().match(/^(\d{1,2})[:.](\d{2})/);
  if (!match) return fallback;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return fallback;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Rydder AI-forslag: bare valgte kanaler og gjenværende dager, gyldige klokkeslett,
 * emneknagger i riktig form og bare bilder som faktisk finnes i biblioteket.
 */
export function cleanDrafts(
  drafts: DraftPost[],
  options: { days: { day: Day; date: string }[]; platforms: Platform[]; assetIds: string[]; max: number },
): CleanPost[] {
  const dateOf = new Map(options.days.map((d) => [d.day, d.date]));
  const out: CleanPost[] = [];
  for (const draft of drafts) {
    const date = dateOf.get(draft.day as Day);
    const platform = draft.platform as Platform;
    const text = draft.text.trim();
    if (!date || !options.platforms.includes(platform) || !text) continue;
    out.push({
      date,
      time: normalizeTime(draft.time),
      platform,
      topic: draft.topic.trim().slice(0, 140),
      pillar: draft.pillar.trim().slice(0, 140),
      text: text.slice(0, MAX_TEXT),
      hashtags: normalizeHashtags(draft.hashtags, platform === "instagram" ? 8 : 3),
      imageIdea: draft.imageIdea.trim().slice(0, 500),
      assetId: draft.imageAssetId && options.assetIds.includes(draft.imageAssetId) ? draft.imageAssetId : null,
    });
    if (out.length >= options.max) break;
  }
  return out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

/** Teksten slik den skal limes inn: innlegg, så emneknagger. */
export function postForCopy(text: string, hashtags: string[]): string {
  return hashtags.length ? `${text.trim()}\n\n${hashtags.join(" ")}` : text.trim();
}
