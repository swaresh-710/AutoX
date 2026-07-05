import { NextResponse } from "next/server";
import { getAccounts } from "@/lib/db/accounts";
import { loadPersonaById, loadCapxFacts } from "@/lib/personas/loader";
import { getSettings } from "@/lib/db/settings";
import { getLLMProvider } from "@/lib/llm";
import { generateWeeklyPlan, calculatePillarDistribution } from "@/lib/planner";
import { getWeeklyPlan, saveWeeklyPlan } from "@/lib/db/plans";
import { TweetVariant, ContentSlot, WeeklyPlan } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accountId, weekStart, nicheContext } = body;

    if (!accountId || !weekStart) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: accountId, weekStart" },
        { status: 400 }
      );
    }

    // 1. Get account
    const accounts = await getAccounts();
    const account = accounts.find((a) => a.id === accountId);
    if (!account) {
      return NextResponse.json(
        { success: false, error: `Account with ID ${accountId} not found` },
        { status: 404 }
      );
    }

    if (!account.personaId) {
      return NextResponse.json(
        { success: false, error: `Account ${account.name} is not mapped to any Persona DNA file` },
        { status: 400 }
      );
    }

    // 2. Load Persona DNA
    const persona = await loadPersonaById(account.personaId);
    if (!persona) {
      return NextResponse.json(
        { success: false, error: `Failed to load Persona DNA file for ID ${account.personaId}` },
        { status: 404 }
      );
    }

    // 3. Load Capx Facts
    const capxFacts = await loadCapxFacts();

    // 4. Get active LLM settings
    const settings = await getSettings();
    const model = settings.defaultModel;
    const provider = getLLMProvider(model);

    // 5. Check if plan already exists, or generate skeleton
    let plan = await getWeeklyPlan(accountId, weekStart);
    if (!plan) {
      // Create new skeleton using account mix and default posting times
      plan = generateWeeklyPlan(
        accountId,
        account.personaId,
        weekStart,
        account.contentMix,
        settings.postsPerWeek,
        settings.defaultPostingTimes
      );
    }

    plan.status = "generating";
    await saveWeeklyPlan(plan);

    // 6. Generate content for empty/draft slots in parallel
    const updatedSlots: ContentSlot[] = await Promise.all(
      plan.slots.map(async (slot, idx) => {
        // If slot already has approved/scheduled content, skip regeneration
        if (slot.status === "approved" || slot.status === "scheduled" || slot.status === "published") {
          return slot;
        }

        try {
          // Generate 3 variants from LLM
          const result = await provider.generateTweet({
            persona,
            pillar: slot.pillar,
            nicheContext: slot.pillar === "niche" ? nicheContext : undefined,
            capxFacts: slot.pillar === "capx" ? capxFacts : [],
          });

          // Create variants structures
          const variants: TweetVariant[] = result.variants.map((vStr, vIdx) => ({
            id: `${slot.id}-v-${vIdx}-${Date.now()}`,
            body: vStr,
            generatedBy: model,
            createdAt: new Date().toISOString(),
            generationMetadata: {
              personaTraitsUsed: result.metadata.personaTraitsUsed,
              factsUsed: result.metadata.factsUsed,
              seedTweetsUsed: result.metadata.seedTweetsUsed,
              nicheContext: slot.pillar === "niche" ? nicheContext : undefined,
              promptVersion: result.metadata.promptVersion,
            },
          }));

          return {
            ...slot,
            variants,
            selectedVariantId: variants[0]?.id || null,
            status: "draft",
          };
        } catch (err: any) {
          console.error(`Failed to generate content for slot ${idx}:`, err);
          return {
            ...slot,
            status: "failed" as any,
          };
        }
      })
    );

    // 7. Save completed plan
    const updatedPlan: WeeklyPlan = {
      ...plan,
      slots: updatedSlots,
      status: "generated",
    };

    const saved = await saveWeeklyPlan(updatedPlan);
    if (saved) {
      return NextResponse.json({ success: true, plan: updatedPlan });
    } else {
      return NextResponse.json(
        { success: false, error: "Failed to save generated plan" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("API generate week error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
