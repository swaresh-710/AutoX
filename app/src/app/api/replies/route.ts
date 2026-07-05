import { NextResponse } from "next/server";
import { getReplies, addReplyDraft } from "@/lib/db/replies";

export async function GET() {
  try {
    const replies = await getReplies();
    return NextResponse.json({ success: true, replies });
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
    if (!body.reply) {
      return NextResponse.json(
        { success: false, error: "Missing reply data in request body" },
        { status: 400 }
      );
    }

    const result = await addReplyDraft(body.reply);
    if (result) {
      return NextResponse.json({ success: true, reply: body.reply });
    } else {
      return NextResponse.json(
        { success: false, error: "Failed to save reply draft" },
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
