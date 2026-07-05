import { NextResponse } from "next/server";
import { getAccounts } from "@/lib/db/accounts";
import { loadPersonaById, loadCapxFacts } from "@/lib/personas/loader";
import { getSettings } from "@/lib/db/settings";
import { getLLMProvider } from "@/lib/llm";
import { TweetVariant } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accountId, pillar, nicheContext, slotId } = body;

    if (!accountId || !pillar || !slotId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: accountId, pillar, slotId" },
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
        { success: false, error: "Account is not mapped to any persona" },
        { status: 400 }
      );
    }

    // 2. Load Persona DNA
    const persona = await loadPersonaById(account.personaId);
    if (!persona) {
      return NextResponse.json(
        { success: false, error: "Failed to load Persona DNA" },
        { status: 404 }
      );
    }

    // 3. Load Capx Facts
    const capxFacts = await loadCapxFacts();

    // 4. Get active LLM settings
    const settings = await getSettings();
    const model = settings.defaultModel;
    const provider = getLLMProvider(model);

    // 5. Generate content
    const result = await provider.generateTweet({
      persona,
      pillar,
      nicheContext: pillar === "niche" ? nicheContext : undefined,
      capxFacts: pillar === "capx" ? capxFacts : [],
    });

    const variants: TweetVariant[] = result.variants.map((vStr, vIdx) => ({
      id: `${slotId}-v-${vIdx}-${Date.now()}`,
      body: vStr,
      generatedBy: model,
      createdAt: new Date().toISOString(),
      generationMetadata: {
        personaTraitsUsed: result.metadata.personaTraitsUsed,
        factsUsed: result.metadata.factsUsed,
        seedTweetsUsed: result.metadata.seedTweetsUsed,
        nicheContext: pillar === "niche" ? nicheContext : undefined,
        promptVersion: result.metadata.promptVersion,
      },
    }));

    return NextResponse.json({ success: true, variants });
  } catch (error: any) {
    console.error("API generate slot error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
