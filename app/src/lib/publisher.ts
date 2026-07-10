import { TwitterApi } from "twitter-api-v2";
import { Account } from "@/types";

export interface PublishResult {
  success: boolean;
  tweetId?: string;
  error?: string;
}

export interface PublishOptions {
  /** When set, the tweet is posted as a reply to this tweet ID. */
  inReplyToTweetId?: string;
}

/**
 * Build an OAuth 1.0a user-context X client for an account from its
 * X_ACCOUNT_<id>_* environment variables. Returns null when the account's
 * credentials are not fully configured. Shared by publishing and metrics
 * ingestion.
 */
export function createXClient(accountId: string): TwitterApi | null {
  const appKey = process.env[`X_ACCOUNT_${accountId}_API_KEY`] || "";
  const appSecret = process.env[`X_ACCOUNT_${accountId}_API_SECRET`] || "";
  const accessToken = process.env[`X_ACCOUNT_${accountId}_ACCESS_TOKEN`] || "";
  const accessSecret = process.env[`X_ACCOUNT_${accountId}_ACCESS_TOKEN_SECRET`] || "";

  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    return null;
  }

  return new TwitterApi({ appKey, appSecret, accessToken, accessSecret });
}

/**
 * Publish a tweet directly to X/Twitter using the account's API credentials.
 */
async function publishToX(account: Account, text: string, options?: PublishOptions): Promise<PublishResult> {
  const client = createXClient(account.id);
  if (!client) {
    return {
      success: false,
      error: `Missing X API credentials in environment for Account ${account.name} (X_ACCOUNT_${account.id}_*)`,
    };
  }

  try {
    const response = await client.v2.tweet(
      text,
      options?.inReplyToTweetId
        ? { reply: { in_reply_to_tweet_id: options.inReplyToTweetId } }
        : undefined
    );
    return {
      success: true,
      tweetId: response.data.id,
    };
  } catch (error: any) {
    console.error(`Direct X publishing error for account ${account.name}:`, error);
    return {
      success: false,
      error: error.message || "Failed to publish tweet via X API",
    };
  }
}

/**
 * Sync a draft to Typefully.
 */
async function publishToTypefully(account: Account, text: string): Promise<PublishResult> {
  const accountId = account.id;
  const typefullyApiKey = process.env[`TYPEFULLY_ACCOUNT_${accountId}_API_KEY` || ""] || "";

  if (!typefullyApiKey) {
    return {
      success: false,
      error: `Missing Typefully API Key in environment for Account ${account.name} (TYPEFULLY_ACCOUNT_${accountId}_API_KEY)`,
    };
  }

  try {
    const response = await fetch("https://api.typefully.com/v1/drafts/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": typefullyApiKey,
      },
      body: JSON.stringify({
        content: text,
        // Publish immediately or let Typefully schedule it
        "thread-position": 1,
      }),
    });

    const data = await response.json();
    if (response.ok) {
      return {
        success: true,
        tweetId: data.id?.toString(), // Typefully draft/thread ID
      };
    } else {
      return {
        success: false,
        error: data.message || "Typefully API returned an error status",
      };
    }
  } catch (error: any) {
    console.error(`Typefully publishing error for account ${account.name}:`, error);
    return {
      success: false,
      error: error.message || "Failed to create draft in Typefully",
    };
  }
}

/**
 * Main publisher router. Handles manual, x-api, and typefully methods.
 */
export async function publishTweet(
  account: Account,
  text: string,
  options?: PublishOptions
): Promise<PublishResult> {
  const method = account.publishMethod;

  if (method === "manual") {
    // For manual mode, returning success since publishing happens manually outside the app.
    return {
      success: true,
      tweetId: "manual-published",
    };
  }

  if (method === "x-api") {
    return publishToX(account, text, options);
  }

  if (method === "typefully") {
    if (options?.inReplyToTweetId) {
      return {
        success: false,
        error:
          "Replies to existing tweets are not supported via Typefully. Switch this account's publishing method to x-api to send replies.",
      };
    }
    return publishToTypefully(account, text);
  }

  return {
    success: false,
    error: `Unsupported publishing method: ${method}`,
  };
}
