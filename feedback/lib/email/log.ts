import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const LOG_DIR = path.join(process.cwd(), ".local-data", "email-log");

export type EmailKind =
  | "analysis_ready"
  | "upgrade_prompt"
  | "comeback"
  | "weekly_progress";

interface EmailLog {
  analysis_ready?: Record<string, string>;
  upgrade_prompt?: string;
  comeback?: string;
  weekly_progress?: string;
}

async function readLog(userId: string): Promise<EmailLog> {
  try {
    const raw = await readFile(path.join(LOG_DIR, `${userId}.json`), "utf8");
    return JSON.parse(raw) as EmailLog;
  } catch {
    return {};
  }
}

async function writeLog(userId: string, log: EmailLog): Promise<void> {
  await mkdir(LOG_DIR, { recursive: true });
  await writeFile(
    path.join(LOG_DIR, `${userId}.json`),
    JSON.stringify(log, null, 2),
    "utf8"
  );
}

export async function wasEmailSent(
  userId: string,
  kind: EmailKind,
  key?: string
): Promise<boolean> {
  const log = await readLog(userId);

  if (kind === "analysis_ready") {
    if (!key) return false;
    return Boolean(log.analysis_ready?.[key]);
  }

  if (kind === "weekly_progress") {
    if (!key) return false;
    return log.weekly_progress === key;
  }

  return Boolean(log[kind]);
}

export async function markEmailSent(
  userId: string,
  kind: EmailKind,
  key?: string
): Promise<void> {
  const log = await readLog(userId);

  if (kind === "analysis_ready" && key) {
    log.analysis_ready = { ...log.analysis_ready, [key]: new Date().toISOString() };
  } else if (kind === "weekly_progress" && key) {
    log.weekly_progress = key;
  } else if (kind === "upgrade_prompt") {
    log.upgrade_prompt = new Date().toISOString();
  } else if (kind === "comeback") {
    log.comeback = new Date().toISOString();
  }

  await writeLog(userId, log);
}

export async function wasEmailSentWithinDays(
  userId: string,
  kind: "upgrade_prompt" | "comeback",
  days: number
): Promise<boolean> {
  const log = await readLog(userId);
  const sentAt = log[kind];
  if (!sentAt) return false;
  return Date.now() - new Date(sentAt).getTime() < days * 86_400_000;
}

export function currentIsoWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
