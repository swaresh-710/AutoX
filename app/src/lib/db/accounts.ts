import fs from "fs";
import path from "path";
import { Account, ContentMix } from "@/types";
import prisma from "./index";

const ACCOUNTS_FILE = path.resolve(process.cwd(), "personas/accounts.json");

const defaultMix: ContentMix = { capx: 55, niche: 30, personal: 15 };

const defaultAccounts: Account[] = [
  { id: "1", name: "Account 1", handle: "@persona1", personaId: "1", publishMethod: "manual", contentMix: defaultMix, status: "disconnected", apiKeyConfigured: false, typefullyConfigured: false, color: "var(--account-1)", createdAt: new Date().toISOString() },
  { id: "2", name: "Account 2", handle: "@persona2", personaId: "2", publishMethod: "manual", contentMix: defaultMix, status: "disconnected", apiKeyConfigured: false, typefullyConfigured: false, color: "var(--account-2)", createdAt: new Date().toISOString() },
  { id: "3", name: "Account 3", handle: "@persona3", personaId: "3", publishMethod: "manual", contentMix: defaultMix, status: "disconnected", apiKeyConfigured: false, typefullyConfigured: false, color: "var(--account-3)", createdAt: new Date().toISOString() },
  { id: "4", name: "Account 4", handle: "@persona4", personaId: "4", publishMethod: "manual", contentMix: defaultMix, status: "disconnected", apiKeyConfigured: false, typefullyConfigured: false, color: "var(--account-4)", createdAt: new Date().toISOString() },
  { id: "5", name: "Account 5", handle: "@persona5", personaId: "5", publishMethod: "manual", contentMix: defaultMix, status: "disconnected", apiKeyConfigured: false, typefullyConfigured: false, color: "var(--account-5)", createdAt: new Date().toISOString() },
  { id: "6", name: "Account 6", handle: "@persona6", personaId: "6", publishMethod: "manual", contentMix: defaultMix, status: "disconnected", apiKeyConfigured: false, typefullyConfigured: false, color: "var(--account-6)", createdAt: new Date().toISOString() },
  { id: "7", name: "Account 7", handle: "@persona7", personaId: "7", publishMethod: "manual", contentMix: defaultMix, status: "disconnected", apiKeyConfigured: false, typefullyConfigured: false, color: "var(--account-7)", createdAt: new Date().toISOString() },
];

function ensureFile() {
  try {
    const dir = path.dirname(ACCOUNTS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(ACCOUNTS_FILE)) {
      fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(defaultAccounts, null, 2), "utf-8");
    }
  } catch (error) {
    console.warn("Skipped accounts file creation (expected on serverless read-only filesystems like Vercel).");
  }
}

/**
 * Loads accounts from file-based storage.
 */
export function loadAccountsFromFile(): Account[] {
  ensureFile();
  try {
    const data = fs.readFileSync(ACCOUNTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to read accounts file:", error);
    return defaultAccounts;
  }
}

/**
 * Saves accounts to file-based storage.
 */
export function saveAccountsToFile(accounts: Account[]): boolean {
  ensureFile();
  try {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Failed to write accounts file:", error);
    return false;
  }
}

/**
 * Check if the Prisma database is configured and migrated.
 */
async function isDbConnected(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    // Perform a fast query
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Loads all accounts. Falls back to local JSON file if DB is not configured or not accessible.
 */
export async function getAccounts(): Promise<Account[]> {
  const dbConnected = await isDbConnected();

  if (dbConnected) {
    try {
      const accounts = await prisma.account.findMany({
        orderBy: { handle: "asc" },
      });
      
      // If DB is connected but empty, seed it from default/file
      if (accounts.length === 0) {
        const fileAccounts = loadAccountsFromFile();
        for (const act of fileAccounts) {
          await prisma.account.create({
            data: {
              id: act.id,
              name: act.name,
              handle: act.handle,
              personaId: act.personaId,
              publishMethod: act.publishMethod,
              color: act.color,
              status: act.status,
              capxMix: act.contentMix.capx,
              nicheMix: act.contentMix.niche,
              personalMix: act.contentMix.personal,
            },
          });
        }
        return fileAccounts;
      }

      return accounts.map((act) => ({
        id: act.id,
        name: act.name,
        handle: act.handle,
        personaId: act.personaId,
        publishMethod: act.publishMethod as any,
        contentMix: {
          capx: act.capxMix,
          niche: act.nicheMix,
          personal: act.personalMix,
        },
        status: act.status as any,
        apiKeyConfigured: !!(act.apiKey && act.accessToken),
        typefullyConfigured: !!act.typefullyApiKey,
        color: act.color,
        createdAt: act.createdAt.toISOString(),
      }));
    } catch (err) {
      console.warn("Database error, falling back to file storage:", err);
      return loadAccountsFromFile();
    }
  }

  return loadAccountsFromFile();
}

/**
 * Updates an account configuration. Updates both DB and File to stay synced.
 */
export async function updateAccount(updated: Account): Promise<boolean> {
  // 1. Update File-based cache first
  const fileAccounts = loadAccountsFromFile();
  const index = fileAccounts.findIndex((a) => a.id === updated.id);
  if (index !== -1) {
    fileAccounts[index] = updated;
    saveAccountsToFile(fileAccounts);
  }

  // 2. Update database if connected
  const dbConnected = await isDbConnected();
  if (dbConnected) {
    try {
      await prisma.account.upsert({
        where: { id: updated.id },
        update: {
          name: updated.name,
          handle: updated.handle,
          personaId: updated.personaId,
          publishMethod: updated.publishMethod,
          color: updated.color,
          status: updated.status,
          capxMix: updated.contentMix.capx,
          nicheMix: updated.contentMix.niche,
          personalMix: updated.contentMix.personal,
        },
        create: {
          id: updated.id,
          name: updated.name,
          handle: updated.handle,
          personaId: updated.personaId,
          publishMethod: updated.publishMethod,
          color: updated.color,
          status: updated.status,
          capxMix: updated.contentMix.capx,
          nicheMix: updated.contentMix.niche,
          personalMix: updated.contentMix.personal,
        },
      });
      return true;
    } catch (err) {
      console.error("Failed to update database account:", err);
      return false;
    }
  }

  return true;
}
