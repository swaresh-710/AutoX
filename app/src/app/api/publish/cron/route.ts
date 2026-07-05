import { NextResponse } from "next/server";
import { getAccounts } from "@/lib/db/accounts";
import { loadPlansFromFile, saveWeeklyPlan } from "@/lib/db/plans";
import { publishTweet } from "@/lib/publisher";
import { addAlert } from "@/lib/db/alerts";
import { WeeklyPlan, ContentSlot } from "@/types";

export async function GET(request: Request) {
  return handleCron();
}

export async function POST(request: Request) {
  return handleCron();
}

async function handleCron() {
  try {
    // 1. Load accounts
    const accounts = await getAccounts();

    // 2. Load all weekly plans
    const plans = loadPlansFromFile();

    const now = new Date();
    const publishedList: Array<{ slotId: string; account: string; text: string; method: string }> = [];
    const failedList: Array<{ slotId: string; account: string; error: string }> = [];

    // Iterate through all plans
    for (const plan of plans) {
      const account = accounts.find((a) => a.id === plan.accountId);
      if (!account) continue;

      let planModified = false;

      // Check each slot in the plan
      const updatedSlots = await Promise.all(
        plan.slots.map(async (slot) => {
          // Only process slots that are approved or scheduled (not drafts, failed, or published)
          if (slot.status !== "approved" && slot.status !== "scheduled") {
            return slot;
          }

          // Parse slot date and time
          const slotDateTime = new Date(`${slot.date}T${slot.scheduledTime}:00`);

          // If due for publishing (scheduled time is past/now)
          if (slotDateTime <= now) {
            // Find selected variant text
            const selectedVar = slot.variants.find((v) => v.id === slot.selectedVariantId);
            const text = selectedVar ? selectedVar.body : (slot.variants[0]?.body || "");

            if (!text) {
              failedList.push({
                slotId: slot.id,
                account: account.handle,
                error: "Empty tweet text",
              });
              addAlert(account.id, account.handle, `Failed to publish slot for ${slot.date}: Tweet text is empty.`, "error");
              planModified = true;
              return { ...slot, status: "failed" as const };
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
              return {
                ...slot,
                status: "published" as const,
              };
            } else {
              failedList.push({
                slotId: slot.id,
                account: account.handle,
                error: result.error || "Unknown error",
              });
              addAlert(account.id, account.handle, `Failed to publish slot for ${slot.date} via ${account.publishMethod}: ${result.error || "Unknown API error"}`, "error");
              return {
                ...slot,
                status: "failed" as const,
              };
            }
          }

          return slot;
        })
      );

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

