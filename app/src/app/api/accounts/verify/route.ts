import { NextResponse } from "next/server";
import { getAccounts, updateAccount } from "@/lib/db/accounts";
import { createXClient } from "@/lib/publisher";

export const dynamic = "force-dynamic";

export interface VerifyResult {
  id: string;
  name: string;
  status: "connected" | "disconnected" | "error";
  /** The @handle the credentials actually authenticate as, per the X API. */
  xHandle?: string;
  error?: string;
}

/**
 * Validate each account's X credentials by calling GET /2/users/me with its
 * own OAuth 1.0a tokens, and persist the resulting connection status.
 */
export async function POST() {
  try {
    const accounts = await getAccounts();
    const results: VerifyResult[] = [];

    for (const account of accounts) {
      const client = createXClient(account.id);

      if (!client) {
        results.push({
          id: account.id,
          name: account.name,
          status: "disconnected",
          error: `X credentials not set (X_ACCOUNT_${account.id}_*)`,
        });
        await updateAccount({ ...account, status: "disconnected" });
        continue;
      }

      try {
        const me = await client.v2.me();
        const xHandle = `@${me.data.username}`;
        results.push({ id: account.id, name: account.name, status: "connected", xHandle });
        await updateAccount({ ...account, status: "connected", handle: xHandle });
      } catch (error: any) {
        results.push({
          id: account.id,
          name: account.name,
          status: "error",
          error: error?.message || "X API rejected the credentials",
        });
        await updateAccount({ ...account, status: "error" });
      }
    }

    const connected = results.filter((r) => r.status === "connected").length;
    return NextResponse.json({ success: true, connected, total: results.length, results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
