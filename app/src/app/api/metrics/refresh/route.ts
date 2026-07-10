import { NextResponse } from "next/server";
import { refreshMetrics } from "@/lib/metrics";
import { isCronAuthorized } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleRefresh(request);
}

export async function POST(request: Request) {
  return handleRefresh(request);
}

async function handleRefresh(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { success: false, error: "DATABASE_URL is not configured — metric snapshots require the database." },
      { status: 503 }
    );
  }

  try {
    const summary = await refreshMetrics();
    return NextResponse.json({ success: true, timestamp: new Date().toISOString(), ...summary });
  } catch (error: any) {
    console.error("[Metrics] Refresh failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
