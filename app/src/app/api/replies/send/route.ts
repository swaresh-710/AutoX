import { NextResponse } from "next/server";
import { getAccounts } from "@/lib/db/accounts";
import { getReplies, updateReplyDraftStatus } from "@/lib/db/replies";
import { publishTweet } from "@/lib/publisher";
import { addAlert } from "@/lib/db/alerts";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { replyId, selectedVariant } = body;

    if (!replyId || !selectedVariant) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: replyId, selectedVariant" },
        { status: 400 }
      );
    }

    // 1. Fetch the reply draft details
    const replies = await getReplies();
    const replyDraft = replies.find((r) => r.id === replyId);
    if (!replyDraft) {
      return NextResponse.json(
        { success: false, error: `Reply draft with ID ${replyId} not found` },
        { status: 404 }
      );
    }

    // 2. Fetch account details mapping
    const accounts = await getAccounts();
    const account = accounts.find((a) => a.personaId === replyDraft.personaId);
    if (!account) {
      return NextResponse.json(
        { success: false, error: `No active Account found mapped to Persona ${replyDraft.personaId}` },
        { status: 404 }
      );
    }

    // Rate Limiting Guardrail: Max 5 replies per 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentSentReplies = replies.filter(
      (r) =>
        r.personaId === replyDraft.personaId &&
        r.status === "sent" &&
        r.sentAt &&
        new Date(r.sentAt).getTime() >= oneDayAgo
    );

    if (recentSentReplies.length >= 5) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate Limit Exceeded: Persona ${replyDraft.personaId} has already sent ${recentSentReplies.length} replies in the last 24 hours. (Limit: 5/day)`,
        },
        { status: 429 }
      );
    }

    // 3. Publish as an actual reply — extract the target tweet ID from the URL
    const tweetIdMatch = replyDraft.sourceTweetUrl.match(/\/status(?:es)?\/(\d+)/);
    if (!tweetIdMatch && account.publishMethod === "x-api") {
      return NextResponse.json(
        {
          success: false,
          error: `Could not extract a tweet ID from source URL "${replyDraft.sourceTweetUrl}" — the reply cannot be threaded.`,
        },
        { status: 400 }
      );
    }

    const result = await publishTweet(account, selectedVariant, {
      inReplyToTweetId: tweetIdMatch ? tweetIdMatch[1] : undefined,
    });

    if (result.success) {
      const nowStr = new Date().toISOString();
      await updateReplyDraftStatus(replyId, "sent", selectedVariant, nowStr);
      return NextResponse.json({ success: true, tweetId: result.tweetId });
    } else {
      await updateReplyDraftStatus(replyId, "failed", selectedVariant);
      await addAlert(
        account.id,
        account.handle,
        `Failed to send reply to ${replyDraft.sourceTweetUrl}: ${result.error || "API error"}`,
        "error"
      );
      return NextResponse.json(
        { success: false, error: result.error || "Failed to publish reply via API" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("API send reply error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
