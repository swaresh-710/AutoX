import { NextResponse } from "next/server";
import { clearAlerts } from "@/lib/db/alerts";

export async function POST() {
  try {
    const success = await clearAlerts();
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
