import fs from "fs";
import path from "path";
import prisma from "./index";

const ALERTS_FILE = path.resolve(process.cwd(), "personas/alerts.json");

export interface AlertItem {
  id: string;
  accountId: string;
  accountHandle: string;
  message: string;
  severity: "info" | "warning" | "error";
  timestamp: string;
  resolved: boolean;
}

function ensureFile() {
  try {
    const dir = path.dirname(ALERTS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(ALERTS_FILE)) {
      fs.writeFileSync(ALERTS_FILE, JSON.stringify([], null, 2), "utf-8");
    }
  } catch (error) {
    console.warn("Skipped alerts file creation (expected on serverless read-only filesystems like Vercel).");
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

function loadAlertsFromFile(): AlertItem[] {
  ensureFile();
  try {
    const data = fs.readFileSync(ALERTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to read alerts file:", error);
    return [];
  }
}

function saveAlertsToFile(alerts: AlertItem[]): boolean {
  ensureFile();
  try {
    fs.writeFileSync(ALERTS_FILE, JSON.stringify(alerts.slice(0, 50), null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Failed to write alerts file:", error);
    return false;
  }
}

export async function getAlerts(): Promise<AlertItem[]> {
  if (await isDbConnected()) {
    try {
      const alerts = await prisma.alert.findMany({
        where: { resolved: false },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return alerts.map((a) => ({
        id: a.id,
        accountId: a.accountId,
        accountHandle: a.accountHandle,
        message: a.message,
        severity: a.severity as AlertItem["severity"],
        timestamp: a.createdAt.toISOString(),
        resolved: a.resolved,
      }));
    } catch (err) {
      console.warn("Database error fetching alerts, falling back to file:", err);
    }
  }
  return loadAlertsFromFile();
}

export async function addAlert(
  accountId: string,
  accountHandle: string,
  message: string,
  severity: "info" | "warning" | "error" = "error"
): Promise<AlertItem | null> {
  if (await isDbConnected()) {
    try {
      const created = await prisma.alert.create({
        data: { accountId, accountHandle, message, severity },
      });
      return {
        id: created.id,
        accountId: created.accountId,
        accountHandle: created.accountHandle,
        message: created.message,
        severity: created.severity as AlertItem["severity"],
        timestamp: created.createdAt.toISOString(),
        resolved: created.resolved,
      };
    } catch (err) {
      console.error("Failed to save alert to DB:", err);
    }
  }

  // Local-dev fallback
  const newAlert: AlertItem = {
    id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    accountId,
    accountHandle,
    message,
    severity,
    timestamp: new Date().toISOString(),
    resolved: false,
  };
  const alerts = loadAlertsFromFile();
  alerts.unshift(newAlert);
  saveAlertsToFile(alerts);
  return newAlert;
}

export async function clearAlerts(): Promise<boolean> {
  if (await isDbConnected()) {
    try {
      await prisma.alert.updateMany({
        where: { resolved: false },
        data: { resolved: true },
      });
      return true;
    } catch (err) {
      console.error("Failed to clear alerts in DB:", err);
      return false;
    }
  }
  return saveAlertsToFile([]);
}
