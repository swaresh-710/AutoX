import { NextResponse } from "next/server";
import { getAccounts } from "@/lib/db/accounts";
import { getAllPlans, saveWeeklyPlan } from "@/lib/db/plans";
import { publishTweet } from "@/lib/publisher";
import { addAlert } from "@/lib/db/alerts";
import { slotDueAt, getScheduleTimezone } from "@/lib/time";
import { isCronAuthorized } from "@/lib/cronAuth";
import { WeeklyPlan } from "@/types";

// The cron does real work (posts tweets) — never let Next.js cache it.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}

async function handleCron(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Load accounts and plans (DB is the source of truth when configured)
    const accounts = await getAccounts();
    const plans = await getAllPlans();

    const now = new Date();
    const timezone = getScheduleTimezone();
    const publishedList: Array<{ slotId: string; account: string; text: string; method: string }> = [];
    const failedList: Array<{ slotId: string; account: string; error: string }> = [];

    // Iterate through all plans
    for (const plan of plans) {
      const account = accounts.find((a) => a.id === plan.accountId);
      if (!account) continue;

      let planModified = false;

      // Publish sequentially per plan to keep per-account rate usage predictable.
      const updatedSlots = [];
      for (const slot of plan.slots) {
        // Only process slots that are approved or scheduled (not drafts, failed, or published)
        if (slot.status !== "approved" && slot.status !== "scheduled") {
          updatedSlots.push(slot);
          continue;
        }

        // Interpret the slot's wall-clock time in the configured schedule timezone
        const dueAt = slotDueAt(slot.date, slot.scheduledTime, timezone);
        if (dueAt > now) {
          updatedSlots.push(slot);
          continue;
        }

        // Find selected variant text
        const selectedVar = slot.variants.find((v) => v.id === slot.selectedVariantId);
        const text = selectedVar ? selectedVar.body : (slot.variants[0]?.body || "");

        if (!text) {
          failedList.push({
            slotId: slot.id,
            account: account.handle,
            error: "Empty tweet text",
          });
          await addAlert(account.id, account.handle, `Failed to publish slot for ${slot.date}: Tweet text is empty.`, "error");
          planModified = true;
          updatedSlots.push({ ...slot, status: "failed" as const });
          continue;
        }

        console.log(`[Cron] Publishing due tweet for ${account.handle}: "${text.substring(0, 30)}..."`);

        const result = await publishTweet(account, text);
        planModified = true;

        if (result.success) {
          publishedList.push({
            slotId: slot.id,
            account: account.handle,
            text,
            method: account.publishMethod,
          });
          updatedSlots.push({
            ...slot,
            status: "published" as const,
            publishedAt: now.toISOString(),
            // Only a real X tweet ID enables metrics ingestion; manual/typefully
            // publishing returns placeholder/draft IDs which we don't store.
            xTweetId: account.publishMethod === "x-api" ? result.tweetId ?? null : slot.xTweetId ?? null,
          });
        } else {
          failedList.push({
            slotId: slot.id,
            account: account.handle,
            error: result.error || "Unknown error",
          });
          await addAlert(account.id, account.handle, `Failed to publish slot for ${slot.date} via ${account.publishMethod}: ${result.error || "Unknown API error"}`, "error");
          updatedSlots.push({ ...slot, status: "failed" as const });
        }
      }

      if (planModified) {
        const updatedPlan: WeeklyPlan = {
          ...plan,
          slots: updatedSlots,
        };
        await saveWeeklyPlan(updatedPlan);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      timezone,
      processedCount: publishedList.length + failedList.length,
      published: publishedList,
      failed: failedList,
    });
  } catch (error: any) {
    console.error("[Cron] Error executing publishing cron:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
