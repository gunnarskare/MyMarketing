// Tester uke- og tidssonehjelperne og ryddingen av AI-forslag.
import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, cleanDrafts, isoWeek, mondayOf, normalizeHashtags, normalizeTime, osloToUtc, planningWeek, postForCopy } from "../../src/lib/week.ts";

test("norsk tid blir riktig UTC, både vinter- og sommertid", () => {
  assert.equal(osloToUtc("2026-11-16", "07:30").toISOString(), "2026-11-16T06:30:00.000Z");
  assert.equal(osloToUtc("2026-07-01", "07:30").toISOString(), "2026-07-01T05:30:00.000Z");
  // Natten sommertiden slutter (25. oktober 2026).
  assert.equal(osloToUtc("2026-10-25", "12:00").toISOString(), "2026-10-25T11:00:00.000Z");
});

test("mandag, ukenummer og datoregning", () => {
  assert.equal(mondayOf("2026-11-14"), "2026-11-09");
  assert.equal(mondayOf("2026-11-16"), "2026-11-16");
  assert.equal(addDays("2026-12-30", 3), "2027-01-02");
  assert.equal(isoWeek("2026-11-16"), 47);
  assert.equal(isoWeek("2027-01-01"), 53);
});

test("planleggingsuke: neste uke har sju dager, denne uka bare dagene som er igjen", () => {
  const saturdayMorning = new Date("2026-11-14T08:00:00Z");
  const next = planningWeek("next", saturdayMorning);
  assert.equal(next.start, "2026-11-16");
  assert.equal(next.end, "2026-11-22");
  assert.equal(next.days.length, 7);
  const thisWeek = planningWeek("this", saturdayMorning);
  assert.deepEqual(thisWeek.days.map((d) => d.day), ["saturday", "sunday"]);
  const saturdayEvening = new Date("2026-11-14T19:00:00Z");
  assert.deepEqual(planningWeek("this", saturdayEvening).days.map((d) => d.day), ["sunday"]);
});

test("emneknagger og klokkeslett ryddes", () => {
  assert.deepEqual(normalizeHashtags(["brød", "#Brød", "##surdeig", "kristiansand sentrum", "#", "a&b"], 8), ["#brød", "#surdeig", "#kristiansandsentrum", "#ab"]);
  assert.equal(normalizeTime("7.30"), "07:30");
  assert.equal(normalizeTime("25:00"), "09:00");
  assert.equal(normalizeTime("kl 8"), "09:00");
});

test("AI-forslag: bare valgte kanaler, gjenværende dager og bilder som finnes", () => {
  const days = [{ day: "monday", date: "2026-11-16" }, { day: "wednesday", date: "2026-11-18" }];
  const base = { topic: "Ukas brød", pillar: "Ferskt", hashtags: ["brød"], imageIdea: "Brød på disken", imageAssetId: null };
  const cleaned = cleanDrafts([
    { ...base, day: "wednesday", time: "11:00", platform: "instagram", text: "Onsdag", imageAssetId: "a1" },
    { ...base, day: "monday", time: "7:30", platform: "facebook", text: "Mandag", imageAssetId: "finnes-ikke" },
    { ...base, day: "tuesday", time: "09:00", platform: "facebook", text: "Tirsdag finnes ikke i uka" },
    { ...base, day: "monday", time: "09:00", platform: "tiktok", text: "Feil kanal" },
    { ...base, day: "monday", time: "09:00", platform: "linkedin", text: "   " },
  ], { days, platforms: ["facebook", "instagram"], assetIds: ["a1"], max: 5 });
  assert.deepEqual(cleaned.map((p) => [p.date, p.time, p.platform, p.assetId]), [
    ["2026-11-16", "07:30", "facebook", null],
    ["2026-11-18", "11:00", "instagram", "a1"],
  ]);
  assert.equal(postForCopy("Hei", ["#a", "#b"]), "Hei\n\n#a #b");
});
