import fs from "fs";
import path from "path";

const ALERTS_FILE = path.resolve(process.cwd(), "../personas/alerts.json");

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

export function getAlerts(): AlertItem[] {
  ensureFile();
  try {
    const data = fs.readFileSync(ALERTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to read alerts file:", error);
    return [];
  }
}

export function addAlert(
  accountId: string,
  accountHandle: string,
  message: string,
  severity: "info" | "warning" | "error" = "error"
) {
  ensureFile();
  try {
    const alerts = getAlerts();
    const newAlert: AlertItem = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      accountId,
      accountHandle,
      message,
      severity,
      timestamp: new Date().toISOString(),
      resolved: false,
    };
    alerts.unshift(newAlert);
    fs.writeFileSync(ALERTS_FILE, JSON.stringify(alerts.slice(0, 50), null, 2), "utf-8");
    return newAlert;
  } catch (error) {
    console.error("Failed to save alert:", error);
    return null;
  }
}

export function clearAlerts() {
  ensureFile();
  try {
    fs.writeFileSync(ALERTS_FILE, JSON.stringify([], null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Failed to clear alerts:", error);
    return false;
  }
}
