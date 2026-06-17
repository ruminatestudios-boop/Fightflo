import { google } from "googleapis";
import {
  isGoogleSheetsConfigured,
  isGoogleSheetsWebhookConfigured,
} from "@/lib/config/env";
import type { ScanCostCollector } from "@/lib/telemetry/scanCost";

const HEADERS = [
  "timestamp",
  "session_id",
  "user_id",
  "sport",
  "video_duration_sec",
  "source_video_bytes",
  "clip_bytes",
  "export_bytes",
  "total_bytes_uploaded",
  "gemini_sport_input_tokens",
  "gemini_sport_output_tokens",
  "gemini_coaching_input_tokens",
  "gemini_coaching_output_tokens",
  "pipeline_duration_sec",
  "gemini_cost_usd",
  "cloudinary_cost_usd",
  "compute_cost_usd",
  "scan_total_usd",
  "running_total_usd",
  "status",
  "pipeline",
  "frame_count",
  "clip_count",
  "error",
] as const;

const RUNNING_TOTAL_COLUMN = "S";

function sheetTabName(): string {
  return process.env.GOOGLE_SHEETS_TAB_NAME?.trim() || "Scan Costs";
}

function sheetRange(suffix: string): string {
  const tab = sheetTabName();
  const quoted = tab.includes(" ") ? `'${tab}'` : tab;
  return `${quoted}!${suffix}`;
}

function getCredentials(): { client_email: string; private_key: string } | null {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    try {
      const parsed = JSON.parse(json) as {
        client_email?: string;
        private_key?: string;
      };
      if (parsed.client_email && parsed.private_key) {
        return {
          client_email: parsed.client_email,
          private_key: parsed.private_key.replace(/\\n/g, "\n"),
        };
      }
    } catch {
      console.error("[scan-cost] Invalid GOOGLE_SERVICE_ACCOUNT_JSON");
      return null;
    }
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();
  if (!email || !key) return null;

  return {
    client_email: email,
    private_key: key.replace(/\\n/g, "\n"),
  };
}

function getSheetsClient() {
  const credentials = getCredentials();
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID?.trim();
  if (!credentials || !spreadsheetId) return null;

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return {
    sheets: google.sheets({ version: "v4", auth }),
    spreadsheetId,
  };
}

async function ensureHeaderRow(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string
): Promise<void> {
  const headerCheck = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetRange("A1:A1"),
  });

  if (headerCheck.data.values?.[0]?.[0]) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: sheetRange("A1"),
    valueInputOption: "RAW",
    requestBody: { values: [HEADERS.slice()] },
  });
}

async function getLastRunningTotalUsd(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string
): Promise<number> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetRange(`${RUNNING_TOTAL_COLUMN}2:${RUNNING_TOTAL_COLUMN}`),
  });

  const rows = res.data.values ?? [];
  if (rows.length === 0) return 0;

  const last = rows[rows.length - 1]?.[0];
  const parsed = typeof last === "number" ? last : parseFloat(String(last));
  return Number.isFinite(parsed) ? parsed : 0;
}

async function appendViaWebhook(
  collector: ScanCostCollector
): Promise<{ scanTotalUsd: number; runningTotalUsd: number }> {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL!.trim();
  const secret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET!.trim();
  const row = collector.toRow(0);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, row }),
  });

  const text = await res.text();
  let payload: {
    ok?: boolean;
    scanTotalUsd?: number;
    runningTotalUsd?: number;
    error?: string;
  } = {};

  try {
    payload = JSON.parse(text) as typeof payload;
  } catch {
    throw new Error(`Google Sheets webhook returned non-JSON: ${text.slice(0, 120)}`);
  }

  if (!res.ok || !payload.ok) {
    throw new Error(payload.error ?? `Webhook failed (${res.status})`);
  }

  return {
    scanTotalUsd: payload.scanTotalUsd ?? 0,
    runningTotalUsd: payload.runningTotalUsd ?? 0,
  };
}

export async function appendScanCostRow(
  collector: ScanCostCollector
): Promise<{ scanTotalUsd: number; runningTotalUsd: number }> {
  if (!isGoogleSheetsConfigured()) {
    return { scanTotalUsd: 0, runningTotalUsd: 0 };
  }

  if (isGoogleSheetsWebhookConfigured()) {
    return appendViaWebhook(collector);
  }

  const client = getSheetsClient();
  if (!client) {
    console.warn("[scan-cost] Google Sheets env incomplete — skipping log");
    return { scanTotalUsd: 0, runningTotalUsd: 0 };
  }

  const { sheets, spreadsheetId } = client;
  await ensureHeaderRow(sheets, spreadsheetId);

  const previousTotal = await getLastRunningTotalUsd(sheets, spreadsheetId);
  const row = collector.toRow(previousTotal);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: sheetRange("A:X"),
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });

  const scanTotalUsd =
    typeof row[17] === "number" ? row[17] : parseFloat(String(row[17]));
  const runningTotalUsd =
    typeof row[18] === "number" ? row[18] : parseFloat(String(row[18]));

  return {
    scanTotalUsd: Number.isFinite(scanTotalUsd) ? scanTotalUsd : 0,
    runningTotalUsd: Number.isFinite(runningTotalUsd) ? runningTotalUsd : 0,
  };
}
