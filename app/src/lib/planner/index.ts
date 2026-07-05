import { ContentMix, ContentSlot, Pillar, WeeklyPlan } from "@/types";

/**
 * Calculates the exact number of posts per pillar based on weekly frequency and mix percentages.
 * Ensures the sum of posts equals postsPerWeek exactly.
 */
export function calculatePillarDistribution(
  postsPerWeek: number,
  mix: ContentMix
): Record<Pillar, number> {
  const capxPct = mix.capx / 100;
  const nichePct = mix.niche / 100;
  const personalPct = mix.personal / 100;

  // Initial calculations
  let capxCount = Math.round(postsPerWeek * capxPct);
  let nicheCount = Math.round(postsPerWeek * nichePct);
  let personalCount = Math.round(postsPerWeek * personalPct);

  // If sum doesn't match postsPerWeek due to rounding, adjust the fields
  let sum = capxCount + nicheCount + personalCount;
  
  if (sum !== postsPerWeek) {
    const diff = postsPerWeek - sum;
    // Calculate remainder fractional parts to see which category to adjust
    const fracCapx = (postsPerWeek * capxPct) - Math.floor(postsPerWeek * capxPct);
    const fracNiche = (postsPerWeek * nichePct) - Math.floor(postsPerWeek * nichePct);
    const fracPersonal = (postsPerWeek * personalPct) - Math.floor(postsPerWeek * personalPct);

    if (diff > 0) {
      // We need more posts. Add to the one with the highest fractional part
      for (let d = 0; d < diff; d++) {
        if (fracCapx >= fracNiche && fracCapx >= fracPersonal) {
          capxCount++;
        } else if (fracNiche >= fracCapx && fracNiche >= fracPersonal) {
          nicheCount++;
        } else {
          personalCount++;
        }
      }
    } else {
      // We have too many posts. Remove from the one with the lowest fractional part (meaning it rounded up the most)
      const absDiff = Math.abs(diff);
      for (let d = 0; d < absDiff; d++) {
        if (fracCapx <= fracNiche && fracCapx <= fracPersonal && capxCount > 0) {
          capxCount--;
        } else if (fracNiche <= fracCapx && fracNiche <= fracPersonal && nicheCount > 0) {
          nicheCount--;
        } else if (personalCount > 0) {
          personalCount--;
        } else if (nicheCount > 0) {
          nicheCount--;
        } else {
          capxCount--;
        }
      }
    }
  }

  return {
    capx: capxCount,
    niche: nicheCount,
    personal: personalCount,
  };
}

/**
 * Distributes a list of pillars across the days of the week evenly.
 */
export function distributePillarsAcrossDays(
  distribution: Record<Pillar, number>,
  daysCount: number = 7
): Pillar[] {
  const pillarsList: Pillar[] = [];
  
  // Flatten distribution list
  for (let i = 0; i < distribution.capx; i++) pillarsList.push("capx");
  for (let i = 0; i < distribution.niche; i++) pillarsList.push("niche");
  for (let i = 0; i < distribution.personal; i++) pillarsList.push("personal");

  // Distribute them evenly using a simple interleaving spacing method
  // Instead of simple random shuffle, we do a structured interleave
  // so that Capx/Niche/Personal are spaced out.
  const result: Pillar[] = new Array(daysCount);
  
  // Sort pillars by count descending to place larger groups first
  const counts = [
    { type: "capx" as Pillar, count: distribution.capx },
    { type: "niche" as Pillar, count: distribution.niche },
    { type: "personal" as Pillar, count: distribution.personal },
  ].sort((a, b) => b.count - a.count);

  let resultIndex = 0;
  for (const group of counts) {
    for (let c = 0; c < group.count; c++) {
      // Find the next empty index in the result array, jumping indices to interleave
      while (result[resultIndex] !== undefined) {
        resultIndex = (resultIndex + 1) % daysCount;
      }
      result[resultIndex] = group.type;
      // Spacing out placement by offset to interleave
      resultIndex = (resultIndex + 2) % daysCount;
    }
  }

  return result;
}

/**
 * Helper to get the calendar date for a given day offset from weekStart
 */
function getOffsetDate(weekStart: Date, dayOffset: number): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().split("T")[0];
}

/**
 * Generates a full WeeklyPlan skeleton mapped with distributed pillars
 */
export function generateWeeklyPlan(
  accountId: string,
  personaId: string,
  weekStartStr: string,
  contentMix: ContentMix,
  postsPerWeek: number = 7,
  postingTimes: string[] = ["09:00"]
): WeeklyPlan {
  const weekStart = new Date(weekStartStr);
  const distribution = calculatePillarDistribution(postsPerWeek, contentMix);
  const distributedPillars = distributePillarsAcrossDays(distribution, postsPerWeek);

  const slots: ContentSlot[] = [];

  for (let i = 0; i < postsPerWeek; i++) {
    const dayOfWeek = i % 7; // e.g. Mon=0, Sun=6
    const dateStr = getOffsetDate(weekStart, i);
    const pillar = distributedPillars[i] || "capx";
    
    // Cycle through posting times if there are multiple times
    const timeIdx = Math.floor(i / 7) % postingTimes.length;
    const scheduledTime = postingTimes[timeIdx] || "09:00";

    slots.push({
      id: `${accountId}-${weekStartStr}-${i}`,
      dayOfWeek,
      date: dateStr,
      pillar,
      scheduledTime,
      variants: [],
      selectedVariantId: null,
      status: "draft",
    });
  }

  return {
    id: `${accountId}-${weekStartStr}`,
    accountId,
    personaId,
    weekStart: weekStartStr,
    slots,
    status: "planned",
    createdAt: new Date().toISOString(),
  };
}
