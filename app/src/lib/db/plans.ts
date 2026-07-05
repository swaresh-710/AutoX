import fs from "fs";
import path from "path";
import { WeeklyPlan, ContentSlot } from "@/types";
import prisma from "./index";

const PLANS_FILE = path.resolve(process.cwd(), "../personas/plans.json");

function ensureFile() {
  try {
    const dir = path.dirname(PLANS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(PLANS_FILE)) {
      fs.writeFileSync(PLANS_FILE, JSON.stringify([], null, 2), "utf-8");
    }
  } catch (error) {
    console.warn("Skipped plans file creation (expected on serverless read-only filesystems like Vercel).");
  }
}

export function loadPlansFromFile(): WeeklyPlan[] {
  ensureFile();
  try {
    const data = fs.readFileSync(PLANS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to read plans file:", error);
    return [];
  }
}

export function savePlansToFile(plans: WeeklyPlan[]): boolean {
  ensureFile();
  try {
    fs.writeFileSync(PLANS_FILE, JSON.stringify(plans, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Failed to write plans file:", error);
    return false;
  }
}

async function isDbConnected(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (e) {
    return false;
  }
}

export async function getWeeklyPlan(
  accountId: string,
  weekStartStr: string
): Promise<WeeklyPlan | null> {
  // 1. Try DB
  const dbConnected = await isDbConnected();
  if (dbConnected) {
    try {
      const plan = await prisma.weeklyPlan.findFirst({
        where: {
          accountId,
          weekStart: new Date(weekStartStr),
        },
        include: {
          slots: {
            include: {
              variants: true,
            },
          },
        },
      });

      if (plan) {
        return {
          id: plan.id,
          accountId: plan.accountId,
          personaId: plan.personaId,
          weekStart: weekStartStr,
          status: plan.status as any,
          slots: plan.slots.map((slot) => ({
            id: slot.id,
            dayOfWeek: slot.dayOfWeek,
            date: slot.date.toISOString().split("T")[0],
            pillar: slot.pillar as any,
            scheduledTime: slot.scheduledTime,
            status: slot.status as any,
            selectedVariantId: slot.selectedVariantId,
            variants: slot.variants.map((v) => ({
              id: v.id,
              body: v.body,
              generatedBy: v.generatedBy as any,
              createdAt: v.createdAt.toISOString(),
              generationMetadata: {
                personaTraitsUsed: v.traitsUsed,
                factsUsed: v.factsUsed,
                seedTweetsUsed: v.seedTweetsUsed,
                nicheContext: v.nicheContext || undefined,
                promptVersion: v.promptVersion,
              },
            })),
          })),
          createdAt: plan.createdAt.toISOString(),
        };
      }
    } catch (err) {
      console.warn("Database getWeeklyPlan error, falling back to files:", err);
    }
  }

  // 2. Fallback to File
  const filePlans = loadPlansFromFile();
  const found = filePlans.find(
    (p) => p.accountId === accountId && p.weekStart === weekStartStr
  );
  return found || null;
}

export async function saveWeeklyPlan(plan: WeeklyPlan): Promise<boolean> {
  // 1. Save to File
  const filePlans = loadPlansFromFile();
  const idx = filePlans.findIndex((p) => p.id === plan.id);
  if (idx !== -1) {
    filePlans[idx] = plan;
  } else {
    filePlans.push(plan);
  }
  savePlansToFile(filePlans);

  // 2. Save to DB if connected
  const dbConnected = await isDbConnected();
  if (dbConnected) {
    try {
      const weekStartDate = new Date(plan.weekStart);
      
      // Upsert weekly plan
      const savedPlan = await prisma.weeklyPlan.upsert({
        where: { id: plan.id },
        update: {
          status: plan.status,
        },
        create: {
          id: plan.id,
          accountId: plan.accountId,
          personaId: plan.personaId,
          weekStart: weekStartDate,
          status: plan.status,
        },
      });

      // Sync slots
      for (const slot of plan.slots) {
        const slotDate = new Date(slot.date);
        const savedSlot = await prisma.contentSlot.upsert({
          where: { id: slot.id },
          update: {
            pillar: slot.pillar,
            scheduledTime: slot.scheduledTime,
            status: slot.status,
            selectedVariantId: slot.selectedVariantId,
          },
          create: {
            id: slot.id,
            weeklyPlanId: savedPlan.id,
            dayOfWeek: slot.dayOfWeek,
            date: slotDate,
            pillar: slot.pillar,
            scheduledTime: slot.scheduledTime,
            status: slot.status,
            selectedVariantId: slot.selectedVariantId,
          },
        });

        // Sync variants
        for (const variant of slot.variants) {
          await prisma.tweetVariant.upsert({
            where: { id: variant.id },
            update: {
              body: variant.body,
              generatedBy: variant.generatedBy,
              traitsUsed: variant.generationMetadata.personaTraitsUsed,
              factsUsed: variant.generationMetadata.factsUsed,
              seedTweetsUsed: variant.generationMetadata.seedTweetsUsed,
              nicheContext: variant.generationMetadata.nicheContext,
              promptVersion: variant.generationMetadata.promptVersion,
            },
            create: {
              id: variant.id,
              contentSlotId: savedSlot.id,
              body: variant.body,
              generatedBy: variant.generatedBy,
              traitsUsed: variant.generationMetadata.personaTraitsUsed,
              factsUsed: variant.generationMetadata.factsUsed,
              seedTweetsUsed: variant.generationMetadata.seedTweetsUsed,
              nicheContext: variant.generationMetadata.nicheContext,
              promptVersion: variant.generationMetadata.promptVersion,
            },
          });
        }
      }
      return true;
    } catch (err) {
      console.error("Failed to save weekly plan to DB:", err);
      return false;
    }
  }

  return true;
}
