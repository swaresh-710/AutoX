import fs from "fs";
import path from "path";
import { ReplyDraft } from "@/types";
import prisma from "./index";

const REPLIES_FILE = path.resolve(process.cwd(), "../personas/replies.json");

function ensureFile() {
  try {
    const dir = path.dirname(REPLIES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(REPLIES_FILE)) {
      fs.writeFileSync(REPLIES_FILE, JSON.stringify([], null, 2), "utf-8");
    }
  } catch (error) {
    console.warn("Skipped replies file creation (expected on serverless read-only filesystems like Vercel).");
  }
}

export function loadRepliesFromFile(): ReplyDraft[] {
  ensureFile();
  try {
    const data = fs.readFileSync(REPLIES_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to read replies file:", error);
    return [];
  }
}

export function saveRepliesToFile(replies: ReplyDraft[]): boolean {
  ensureFile();
  try {
    fs.writeFileSync(REPLIES_FILE, JSON.stringify(replies, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Failed to write replies file:", error);
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

export async function getReplies(): Promise<ReplyDraft[]> {
  const dbConnected = await isDbConnected();
  if (dbConnected) {
    try {
      const dbReplies = await prisma.replyDraft.findMany({
        orderBy: { createdAt: "desc" },
      });
      return dbReplies.map((r) => ({
        id: r.id,
        sourceTweetUrl: r.sourceTweetUrl,
        sourceTweetText: r.sourceTweetText,
        personaId: r.personaId,
        variants: r.variants,
        selectedVariant: r.selectedVariant || undefined,
        status: r.status as any,
        sentAt: r.sentAt ? r.sentAt.toISOString() : undefined,
        createdAt: r.createdAt.toISOString(),
      }));
    } catch (err) {
      console.warn("Database error fetching replies, falling back to file:", err);
    }
  }

  return loadRepliesFromFile();
}

export async function addReplyDraft(reply: ReplyDraft): Promise<boolean> {
  // 1. File
  const fileReplies = loadRepliesFromFile();
  fileReplies.unshift(reply);
  saveRepliesToFile(fileReplies.slice(0, 100)); // limit file cache size

  // 2. DB if connected
  const dbConnected = await isDbConnected();
  if (dbConnected) {
    try {
      await prisma.replyDraft.create({
        data: {
          id: reply.id,
          sourceTweetUrl: reply.sourceTweetUrl,
          sourceTweetText: reply.sourceTweetText,
          personaId: reply.personaId,
          variants: reply.variants,
          selectedVariant: reply.selectedVariant || null,
          status: reply.status,
          sentAt: reply.sentAt ? new Date(reply.sentAt) : null,
          createdAt: new Date(reply.createdAt),
        },
      });
      return true;
    } catch (err) {
      console.error("Failed to save reply draft to DB:", err);
      return false;
    }
  }

  return true;
}

export async function updateReplyDraftStatus(
  id: string,
  status: "drafted" | "approved" | "sent" | "failed",
  selectedVariant?: string,
  sentAt?: string
): Promise<boolean> {
  // 1. File
  const fileReplies = loadRepliesFromFile();
  const idx = fileReplies.findIndex((r) => r.id === id);
  if (idx !== -1) {
    fileReplies[idx].status = status;
    if (selectedVariant !== undefined) fileReplies[idx].selectedVariant = selectedVariant;
    if (sentAt !== undefined) fileReplies[idx].sentAt = sentAt;
    saveRepliesToFile(fileReplies);
  }

  // 2. DB if connected
  const dbConnected = await isDbConnected();
  if (dbConnected) {
    try {
      await prisma.replyDraft.update({
        where: { id },
        data: {
          status,
          selectedVariant: selectedVariant || null,
          sentAt: sentAt ? new Date(sentAt) : null,
        },
      });
      return true;
    } catch (err) {
      console.error("Failed to update reply status in DB:", err);
      return false;
    }
  }

  return true;
}
