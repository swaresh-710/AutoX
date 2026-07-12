import { NextResponse } from "next/server";
import { getAlerts } from "@/lib/db/alerts";

export async function GET() {
  try {
    const alerts = await getAlerts();
    return NextResponse.json({ success: true, alerts });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
