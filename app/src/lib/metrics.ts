import { TweetV2 } from "twitter-api-v2";
import prisma from "./db/index";
import { createXClient } from "./publisher";

export interface RefreshSummary {
  refreshedTweets: number;
  accountsProcessed: number;
  accountsSkipped: Array<{ accountId: string; reason: string }>;
  errors: Array<{ accountId: string; error: string }>;
}

/** X API allows up to 100 tweet IDs per lookup request. */
const BATCH_SIZE = 100;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

async function fetchTweetBatch(
  client: NonNullable<ReturnType<typeof createXClient>>,
  ids: string[]
): Promise<TweetV2[]> {
  try {
    // non_public_metrics (impressions breakdown, url_link_clicks) requires
    // user-context auth and only works for the authenticated user's own
    // tweets under 30 days old — exactly our case, but fall back to public
    // metrics if the API rejects it (e.g. mixed authorship or access level).
    const res = await client.v2.tweets(ids, {
      "tweet.fields": ["public_metrics", "non_public_metrics"],
    });
    return res.data ?? [];
  } catch {
    const res = await client.v2.tweets(ids, {
      "tweet.fields": ["public_metrics"],
    });
    return res.data ?? [];
  }
}

/**
 * Pull current metrics from the X API for every published slot that has an
 * X tweet ID, and store one snapshot row per tweet. Requires the database —
 * snapshots have no filesystem fallback.
 */
export async function refreshMetrics(): Promise<RefreshSummary> {
  const summary: RefreshSummary = {
    refreshedTweets: 0,
    accountsProcessed: 0,
    accountsSkipped: [],
    errors: [],
  };

  // Published slots with a real tweet ID, grouped by owning account
  const slots = await prisma.contentSlot.findMany({
    where: { status: "published", xTweetId: { not: null } },
    select: {
      id: true,
      xTweetId: true,
      weeklyPlan: { select: { accountId: true } },
    },
  });

  const byAccount = new Map<string, Array<{ slotId: string; tweetId: string }>>();
  for (const slot of slots) {
    const accountId = slot.weeklyPlan.accountId;
    if (!byAccount.has(accountId)) byAccount.set(accountId, []);
    byAccount.get(accountId)!.push({ slotId: slot.id, tweetId: slot.xTweetId! });
  }

  for (const [accountId, entries] of Array.from(byAccount.entries())) {
    const client = createXClient(accountId);
    if (!client) {
      summary.accountsSkipped.push({
        accountId,
        reason: `X credentials not configured (X_ACCOUNT_${accountId}_*)`,
      });
      continue;
    }

    const slotByTweetId = new Map(entries.map((e) => [e.tweetId, e.slotId]));

    try {
      for (const batch of chunk(entries.map((e) => e.tweetId), BATCH_SIZE)) {
        const tweets = await fetchTweetBatch(client, batch);
        for (const tweet of tweets) {
          const slotId = slotByTweetId.get(tweet.id);
          const pub = tweet.public_metrics;
          if (!slotId || !pub) continue;

          await prisma.slotMetricSnapshot.create({
            data: {
              contentSlotId: slotId,
              impressions: pub.impression_count ?? 0,
              likes: pub.like_count ?? 0,
              replies: pub.reply_count ?? 0,
              reposts: (pub.retweet_count ?? 0) + (pub.quote_count ?? 0),
              bookmarks: pub.bookmark_count ?? 0,
              linkClicks: tweet.non_public_metrics?.url_link_clicks ?? 0,
            },
          });
          summary.refreshedTweets++;
        }
      }
      summary.accountsProcessed++;
    } catch (error: any) {
      summary.errors.push({
        accountId,
        error: error?.message || "Failed to fetch tweet metrics",
      });
    }
  }

  return summary;
}

export interface SlotMetrics {
  impressions: number;
  likes: number;
  replies: number;
  reposts: number;
  bookmarks: number;
  linkClicks: number;
  capturedAt: string;
}

/**
 * Latest stored snapshot per content slot, keyed by slot ID.
 * Returns an empty map when the database is unavailable.
 */
export async function getLatestMetricsBySlot(): Promise<Map<string, SlotMetrics>> {
  const map = new Map<string, SlotMetrics>();
  if (!process.env.DATABASE_URL) return map;
  try {
    const snapshots = await prisma.slotMetricSnapshot.findMany({
      orderBy: { capturedAt: "desc" },
      distinct: ["contentSlotId"],
    });
    for (const s of snapshots) {
      map.set(s.contentSlotId, {
        impressions: s.impressions,
        likes: s.likes,
        replies: s.replies,
        reposts: s.reposts,
        bookmarks: s.bookmarks,
        linkClicks: s.linkClicks,
        capturedAt: s.capturedAt.toISOString(),
      });
    }
  } catch (err) {
    console.warn("Failed to load metric snapshots:", err);
  }
  return map;
}
