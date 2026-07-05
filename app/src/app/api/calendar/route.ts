import { NextResponse } from "next/server";
import { getAccounts } from "@/lib/db/accounts";
import { getWeeklyPlan } from "@/lib/db/plans";
import { Pillar } from "@/types";

export interface CalendarEvent {
  id: string;
  accountId: string;
  accountName: string;
  accountHandle: string;
  accountColor: string;
  date: string;
  dayOfWeek: number;
  pillar: Pillar;
  time: string;
  body: string;
  status: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get("weekStart");

    if (!weekStart) {
      return NextResponse.json(
        { success: false, error: "Missing required query parameter: weekStart" },
        { status: 400 }
      );
    }

    // 1. Fetch all accounts
    const accounts = await getAccounts();

    // 2. Fetch plans for all accounts for this week in parallel
    const events: CalendarEvent[] = [];

    await Promise.all(
      accounts.map(async (account) => {
        const plan = await getWeeklyPlan(account.id, weekStart);
        if (plan) {
          plan.slots.forEach((slot) => {
            // Find selected variant text
            const selectedVar = slot.variants.find((v) => v.id === slot.selectedVariantId);
            const body = selectedVar ? selectedVar.body : (slot.variants[0]?.body || "");

            events.push({
              id: slot.id,
              accountId: account.id,
              accountName: account.name,
              accountHandle: account.handle,
              accountColor: account.color,
              date: slot.date,
              dayOfWeek: slot.dayOfWeek,
              pillar: slot.pillar,
              time: slot.scheduledTime,
              body,
              status: slot.status,
            });
          });
        }
      })
    );

    // Sort events by date and time
    events.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });

    return NextResponse.json({ success: true, events });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
