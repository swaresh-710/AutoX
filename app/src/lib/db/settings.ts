import fs from "fs";
import path from "path";
import { AppSettings, ContentMix } from "@/types";
import prisma from "./index";

const SETTINGS_FILE = path.resolve(process.cwd(), "../personas/settings.json");

const defaultSettings: AppSettings = {
  defaultModel: "gemini-flash",
  defaultContentMix: { capx: 55, niche: 30, personal: 15 },
  postsPerWeek: 7,
  defaultPostingTimes: ["09:00", "13:00", "18:00"],
  geminiKeyConfigured: false,
  claudeKeyConfigured: false,
};

function ensureFile() {
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(SETTINGS_FILE)) {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2), "utf-8");
    }
  } catch (error) {
    console.warn("Skipped settings file creation (expected on serverless read-only filesystems like Vercel).");
  }
}

export function loadSettingsFromFile(): AppSettings {
  ensureFile();
  try {
    const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to read settings file:", error);
    return defaultSettings;
  }
}

export function saveSettingsToFile(settings: AppSettings): boolean {
  ensureFile();
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Failed to write settings file:", error);
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

export async function getSettings(): Promise<AppSettings> {
  const fileSettings = loadSettingsFromFile();
  
  // Update configuration flags from environment variables dynamically
  fileSettings.geminiKeyConfigured = !!process.env.GEMINI_API_KEY;
  fileSettings.claudeKeyConfigured = !!process.env.CLAUDE_API_KEY;

  const dbConnected = await isDbConnected();
  if (dbConnected) {
    try {
      const dbSettings = await prisma.appSettings.findUnique({
        where: { id: "global" },
      });

      if (!dbSettings) {
        // Seed database AppSettings
        await prisma.appSettings.create({
          data: {
            id: "global",
            defaultModel: fileSettings.defaultModel,
            capxMixDefault: fileSettings.defaultContentMix.capx,
            nicheMixDefault: fileSettings.defaultContentMix.niche,
            personalMixDefault: fileSettings.defaultContentMix.personal,
            postsPerWeekDefault: fileSettings.postsPerWeek,
            postingTimesDefault: fileSettings.defaultPostingTimes,
          },
        });
        return fileSettings;
      }

      return {
        defaultModel: dbSettings.defaultModel as any,
        defaultContentMix: {
          capx: dbSettings.capxMixDefault,
          niche: dbSettings.nicheMixDefault,
          personal: dbSettings.personalMixDefault,
        },
        postsPerWeek: dbSettings.postsPerWeekDefault,
        defaultPostingTimes: dbSettings.postingTimesDefault,
        geminiKeyConfigured: fileSettings.geminiKeyConfigured,
        claudeKeyConfigured: fileSettings.claudeKeyConfigured,
      };
    } catch (err) {
      console.warn("Database app settings read error, using file:", err);
      return fileSettings;
    }
  }

  return fileSettings;
}

export async function updateSettings(settings: AppSettings): Promise<boolean> {
  // 1. Save to File
  saveSettingsToFile(settings);

  // 2. Save to DB if connected
  const dbConnected = await isDbConnected();
  if (dbConnected) {
    try {
      await prisma.appSettings.upsert({
        where: { id: "global" },
        update: {
          defaultModel: settings.defaultModel,
          capxMixDefault: settings.defaultContentMix.capx,
          nicheMixDefault: settings.defaultContentMix.niche,
          personalMixDefault: settings.defaultContentMix.personal,
          postsPerWeekDefault: settings.postsPerWeek,
          postingTimesDefault: settings.defaultPostingTimes,
        },
        create: {
          id: "global",
          defaultModel: settings.defaultModel,
          capxMixDefault: settings.defaultContentMix.capx,
          nicheMixDefault: settings.defaultContentMix.niche,
          personalMixDefault: settings.defaultContentMix.personal,
          postsPerWeekDefault: settings.postsPerWeek,
          postingTimesDefault: settings.defaultPostingTimes,
        },
      });
      return true;
    } catch (err) {
      console.error("Failed to update database AppSettings:", err);
      return false;
    }
  }

  return true;
}
