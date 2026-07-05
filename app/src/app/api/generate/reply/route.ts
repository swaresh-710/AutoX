import { NextResponse } from "next/server";
import { getAccounts } from "@/lib/db/accounts";
import { loadPersonaById } from "@/lib/personas/loader";
import { getSettings } from "@/lib/db/settings";
import { getLLMProvider } from "@/lib/llm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accountId, tweetText, threadContext } = body;

    if (!accountId || !tweetText) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: accountId, tweetText" },
        { status: 400 }
      );
    }

    // 1. Get account
    const accounts = await getAccounts();
    const account = accounts.find((a) => a.id === accountId);
    if (!account) {
      return NextResponse.json(
        { success: false, error: `Account ${accountId} not found` },
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

    // 3. Get active LLM settings
    const settings = await getSettings();
    const model = settings.defaultModel;
    const provider = getLLMProvider(model);

    // 4. Generate in-character replies
    const result = await provider.generateReply(persona, tweetText, threadContext);

    return NextResponse.json({
      success: true,
      variants: result.variants,
      model,
    });
  } catch (error: any) {
    console.error("API generate reply error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
