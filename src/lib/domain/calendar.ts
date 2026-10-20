/**
 * Meetings → calendar apps. Two routes: a private .ics feed Google Calendar subscribes to
 * (follows every change, on Google's own refresh schedule), and a one-tap "add to Google
 * Calendar" link for a single meeting (instant, but a copy that won't follow later edits).
 */

export type FeedMeeting = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  url: string | null;
  agenda: string;
  participants: string[];
  updated_at: string;
};

/** A meeting without an end time shows as one hour. */
const DEFAULT_MINUTES = 60;

function endOf(m: { starts_at: string; ends_at: string | null }) {
  return m.ends_at ? new Date(m.ends_at) : new Date(new Date(m.starts_at).getTime() + DEFAULT_MINUTES * 60_000);
}

/** 2026-10-20T09:30:00.000Z → 20261020T093000Z */
export function icsTime(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** RFC 5545 caps lines at 75 bytes; Arabic is 2 bytes a letter, so fold by bytes without splitting a character. */
export function foldLine(line: string) {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes + n > limit) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

function description(m: FeedMeeting, appUrl: string) {
  const parts: string[] = [];
  if (m.agenda.trim()) parts.push(m.agenda.trim());
  if (m.participants.length) parts.push(`👥 ${m.participants.join("، ")}`);
  if (m.url) parts.push(m.url);
  parts.push(`قدّام: ${appUrl}/meetings/${m.id}`);
  return parts.join("\n\n");
}

export function buildIcs(meetings: FeedMeeting[], opts: { appUrl: string; timezone: string; now?: Date }) {
  const stamp = icsTime(opts.now ?? new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Qaddam//Meetings//AR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:قدّام",
    `X-WR-TIMEZONE:${opts.timezone}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const m of meetings) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${m.id}@qaddam`,
      `DTSTAMP:${stamp}`,
      `LAST-MODIFIED:${icsTime(new Date(m.updated_at))}`,
      `DTSTART:${icsTime(new Date(m.starts_at))}`,
      `DTEND:${icsTime(endOf(m))}`,
      `SUMMARY:${escapeText(m.title)}`,
      `DESCRIPTION:${escapeText(description(m, opts.appUrl))}`,
    );
    if (m.location) lines.push(`LOCATION:${escapeText(m.location)}`);
    lines.push(`URL:${m.url || `${opts.appUrl}/meetings/${m.id}`}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/** Google Calendar's "new event" page, pre-filled with this meeting. */
export function googleEventUrl(m: Omit<FeedMeeting, "updated_at">, appUrl: string) {
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: m.title,
    dates: `${icsTime(new Date(m.starts_at))}/${icsTime(endOf(m))}`,
    details: description(m as FeedMeeting, appUrl),
  });
  if (m.location) q.set("location", m.location);
  return `https://calendar.google.com/calendar/render?${q}`;
}

/** Opens Google Calendar's "add this calendar?" prompt for the feed. */
export function googleSubscribeUrl(feedUrl: string) {
  return `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(feedUrl.replace(/^https?:/, "webcal:"))}`;
}
