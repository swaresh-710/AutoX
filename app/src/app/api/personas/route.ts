import { NextResponse } from "next/server";
import { loadAllPersonas, savePersona } from "@/lib/personas/loader";

export async function GET() {
  try {
    const personas = await loadAllPersonas();
    return NextResponse.json({ success: true, personas });
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
    if (!body.persona) {
      return NextResponse.json(
        { success: false, error: "Missing persona data in request body" },
        { status: 400 }
      );
    }

    const result = await savePersona(body.persona);
    if (result) {
      return NextResponse.json({ success: true, persona: body.persona });
    } else {
      return NextResponse.json(
        { success: false, error: "Failed to save persona file" },
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
