import { NextResponse } from "next/server";
import { getAccounts, updateAccount } from "@/lib/db/accounts";

export async function GET() {
  try {
    const accounts = await getAccounts();
    return NextResponse.json({ success: true, accounts });
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
    if (!body.account) {
      return NextResponse.json(
        { success: false, error: "Missing account data in request body" },
        { status: 400 }
      );
    }

    const result = await updateAccount(body.account);
    if (result) {
      return NextResponse.json({ success: true, account: body.account });
    } else {
      return NextResponse.json(
        { success: false, error: "Failed to update account" },
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
