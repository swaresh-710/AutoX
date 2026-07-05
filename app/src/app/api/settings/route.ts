import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/db/settings";

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({ success: true, settings });
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
    if (!body.settings) {
      return NextResponse.json(
        { success: false, error: "Missing settings data in request body" },
        { status: 400 }
      );
    }

    const result = await updateSettings(body.settings);
    if (result) {
      return NextResponse.json({ success: true, settings: body.settings });
    } else {
      return NextResponse.json(
        { success: false, error: "Failed to update settings" },
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
