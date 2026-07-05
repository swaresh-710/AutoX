import { NextResponse } from "next/server";
import { loadPersonaById } from "@/lib/personas/loader";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const persona = await loadPersonaById(id);
    if (!persona) {
      return NextResponse.json(
        { success: false, error: `Persona with ID ${id} not found` },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, persona });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
