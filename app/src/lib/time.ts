/**
 * Timezone-aware scheduling helpers.
 *
 * Slot times are stored as a date string ("YYYY-MM-DD") plus a wall-clock
 * time ("HH:MM"). They are interpreted in SCHEDULE_TIMEZONE (IANA name,
 * e.g. "Asia/Kolkata"), defaulting to UTC — NOT in the server's local zone,
 * which on Vercel is always UTC regardless of where the user lives.
 */

export function getScheduleTimezone(): string {
  return process.env.SCHEDULE_TIMEZONE || "UTC";
}

/** Offset (ms) of `timeZone` from UTC at the given UTC instant. */
function tzOffsetMs(utcMillis: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(new Date(utcMillis))) {
    parts[p.type] = p.value;
  }
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - utcMillis;
}

/**
 * Convert a wall-clock date + time in the schedule timezone to a UTC Date.
 */
export function slotDueAt(dateStr: string, timeStr: string, timeZone?: string): Date {
  const tz = timeZone || getScheduleTimezone();
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const naiveUtc = Date.UTC(y, m - 1, d, hh || 0, mm || 0);
  // Two-pass offset lookup handles DST transitions near the target instant.
  const guess = naiveUtc - tzOffsetMs(naiveUtc, tz);
  return new Date(naiveUtc - tzOffsetMs(guess, tz));
}
