import { describe, expect, it } from "vitest";
import { buildIcs, foldLine, googleEventUrl, googleSubscribeUrl, icsTime } from "./calendar";

const meeting = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "اجتماع اللجنة, الأسبوعي",
  starts_at: "2026-10-21T08:00:00Z",
  ends_at: null,
  location: "القاعة 2",
  url: null,
  agenda: "بند أول\nبند ثانٍ",
  participants: ["سارة", "يوسف"],
  updated_at: "2026-10-20T09:00:00Z",
};

describe("calendar feed", () => {
  it("formats times in UTC", () => {
    expect(icsTime(new Date("2026-10-21T08:05:09.123Z"))).toBe("20261021T080509Z");
  });

  it("builds a valid event with escaped text and a one-hour default", () => {
    const ics = buildIcs([meeting], { appUrl: "https://app.test", timezone: "Africa/Casablanca", now: new Date("2026-10-20T10:00:00Z") });
    const unfolded = ics.replace(/\r\n /g, "");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(unfolded).toContain("UID:11111111-1111-4111-8111-111111111111@qaddam");
    expect(unfolded).toContain("DTSTART:20261021T080000Z");
    expect(unfolded).toContain("DTEND:20261021T090000Z");
    expect(unfolded).toContain("SUMMARY:اجتماع اللجنة\\, الأسبوعي");
    expect(unfolded).toContain("بند أول\\nبند ثانٍ");
    expect(unfolded).toContain("https://app.test/meetings/11111111-1111-4111-8111-111111111111");
    expect(ics.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  });

  it("folds long Arabic lines by bytes without breaking letters", () => {
    const line = "SUMMARY:" + "قدّام ".repeat(40);
    const folded = foldLine(line);
    expect(folded.replace(/\r\n /g, "")).toBe(line);
    expect(folded.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  });

  it("links to Google Calendar", () => {
    const u = new URL(googleEventUrl(meeting, "https://app.test"));
    expect(u.searchParams.get("dates")).toBe("20261021T080000Z/20261021T090000Z");
    expect(u.searchParams.get("location")).toBe("القاعة 2");
    expect(googleSubscribeUrl("https://app.test/api/calendar/abc.ics")).toBe(
      "https://calendar.google.com/calendar/render?cid=webcal%3A%2F%2Fapp.test%2Fapi%2Fcalendar%2Fabc.ics",
    );
  });
});
