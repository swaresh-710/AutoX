import { NextResponse } from "next/server";
import { getWeeklyPlan, saveWeeklyPlan } from "@/lib/db/plans";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const weekStart = searchParams.get("weekStart");

    if (!accountId || !weekStart) {
      return NextResponse.json(
        { success: false, error: "Missing required query parameters: accountId, weekStart" },
        { status: 400 }
      );
    }

    const plan = await getWeeklyPlan(accountId, weekStart);
    return NextResponse.json({ success: true, plan });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.plan) {
      return NextResponse.json(
        { success: false, error: "Missing plan data in request body" },
        { status: 400 }
      );
    }

    const result = await saveWeeklyPlan(body.plan);
    if (result) {
      return NextResponse.json({ success: true, plan: body.plan });
    } else {
      return NextResponse.json(
        { success: false, error: "Failed to update plan" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
