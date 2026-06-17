/**
 * Fightflo scan-cost logger — paste into your Google Sheet:
 * Extensions → Apps Script → paste → Save → Deploy → New deployment → Web app
 *
 * Execute as: Me
 * Who has access: Anyone
 *
 * Copy the web app URL → GOOGLE_SHEETS_WEBHOOK_URL in Vercel
 * Set WEBHOOK_SECRET below → GOOGLE_SHEETS_WEBHOOK_SECRET in Vercel
 */

const WEBHOOK_SECRET = "change-me-to-a-long-random-string";
const TAB_NAME = "Scan Costs";

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
];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(TAB_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(TAB_NAME);
  }
  return sheet;
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0 || !sheet.getRange(1, 1).getValue()) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
}

function lastRunningTotal_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const col = HEADERS.indexOf("running_total_usd") + 1;
  const value = sheet.getRange(lastRow, col).getValue();
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (!body.secret || body.secret !== WEBHOOK_SECRET) {
      return json_({ ok: false, error: "unauthorized" });
    }
    if (!Array.isArray(body.row) || body.row.length < 18) {
      return json_({ ok: false, error: "invalid row" });
    }

    const sheet = getSheet_();
    ensureHeaders_(sheet);

    const row = body.row.slice();
    const scanTotal = parseFloat(row[17]) || 0;
    const runningTotal = lastRunningTotal_(sheet) + scanTotal;
    row[18] = Math.round(runningTotal * 10000) / 10000;

    sheet.appendRow(row);

    return json_({
      ok: true,
      scanTotalUsd: scanTotal,
      runningTotalUsd: row[18],
    });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}
