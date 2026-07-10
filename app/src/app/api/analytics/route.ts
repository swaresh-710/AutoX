import { NextResponse } from "next/server";
import { getAccounts } from "@/lib/db/accounts";
import { getAllPlans } from "@/lib/db/plans";
import { getLatestMetricsBySlot } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export interface AccountPerformance {
  id: string;
  name: string;
  handle: string;
  color: string;
  impressions: number;
  likes: number;
  replies: number;
  clicks: number;
  tweetsCount: number;
  /** Published tweets that have at least one metric snapshot. */
  trackedTweetsCount: number;
  engagementRate: number;
}

export interface TopTweet {
  id: string;
  handle: string;
  text: string;
  pillar: string;
  engagements: number;
  impressions: number;
  clicks: number;
}

export async function GET() {
  try {
    const accounts = await getAccounts();
    const plans = await getAllPlans();
    const metricsBySlot = await getLatestMetricsBySlot();

    const topTweetCandidates: TopTweet[] = [];

    const performances: AccountPerformance[] = accounts.map((act) => {
      let impressions = 0;
      let likes = 0;
      let replies = 0;
      let clicks = 0;
      let tweetsCount = 0;
      let trackedTweetsCount = 0;

      plans
        .filter((p) => p.accountId === act.id)
        .forEach((plan) => {
          plan.slots
            .filter((s) => s.status === "published")
            .forEach((slot) => {
              tweetsCount++;

              const metrics = metricsBySlot.get(slot.id);
              if (!metrics) return;

              trackedTweetsCount++;
              impressions += metrics.impressions;
              likes += metrics.likes;
              replies += metrics.replies;
              clicks += metrics.linkClicks;

              const selectedVar =
                slot.variants.find((v) => v.id === slot.selectedVariantId) || slot.variants[0];
              topTweetCandidates.push({
                id: slot.id,
                handle: act.handle,
                text: selectedVar?.body || "",
                pillar: slot.pillar,
                engagements: metrics.likes + metrics.replies + metrics.reposts,
                impressions: metrics.impressions,
                clicks: metrics.linkClicks,
              });
            });
        });

      const totalEngagements = likes + replies;
      const engagementRate =
        impressions > 0 ? parseFloat(((totalEngagements / impressions) * 100).toFixed(1)) : 0;

      return {
        id: act.id,
        name: act.name,
        handle: act.handle,
        color: act.color,
        impressions,
        likes,
        replies,
        clicks,
        tweetsCount,
        trackedTweetsCount,
        engagementRate,
      };
    });

    // Compute totals
    const totals = performances.reduce(
      (acc, curr) => ({
        impressions: acc.impressions + curr.impressions,
        likes: acc.likes + curr.likes,
        replies: acc.replies + curr.replies,
        clicks: acc.clicks + curr.clicks,
        tweetsCount: acc.tweetsCount + curr.tweetsCount,
      }),
      { impressions: 0, likes: 0, replies: 0, clicks: 0, tweetsCount: 0 }
    );

    const totalEngagements = totals.likes + totals.replies;
    const avgEngagementRate =
      totals.impressions > 0
        ? parseFloat(((totalEngagements / totals.impressions) * 100).toFixed(1))
        : 0;

    const topTweets = topTweetCandidates
      .sort((a, b) => b.engagements - a.engagements)
      .slice(0, 3);

    return NextResponse.json({
      success: true,
      totals: {
        ...totals,
        engagementRate: avgEngagementRate,
      },
      performances,
      topTweets,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
