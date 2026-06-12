#!/usr/bin/env node
/**
 * Pre-generate FlowBag coach audio via ElevenLabs.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=... ELEVENLABS_VOICE_ID=... node scripts/generate-audio.js
 *   npm run generate:audio
 *
 * Loads phrases from scripts/flowbag-phrases.json
 * Saves to public/audio/{id}.mp3
 * Skips files that already exist.
 */

const fs = require("fs");
const path = require("path");

const VOICE_SETTINGS = {
  stability: 0.75,
  similarity_boost: 0.85,
  style: 0.4,
  use_speaker_boost: true,
};

/** ~$0.30 per 1,000 characters (ElevenLabs Turbo rough estimate) */
const COST_PER_CHAR_USD = 0.3 / 1000;

const root = path.join(__dirname, "..");
const outDir = path.join(root, "public", "audio");
const phrasesPath = path.join(__dirname, "flowbag-phrases.json");

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    const val = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  loadEnvLocal();

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  if (!apiKey || !voiceId) {
    console.error(
      "Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID.\n" +
        "Add them to .env.local or export before running."
    );
    process.exit(1);
  }

  if (!fs.existsSync(phrasesPath)) {
    console.error(`Phrase list not found: ${phrasesPath}`);
    process.exit(1);
  }

  const phrases = JSON.parse(fs.readFileSync(phrasesPath, "utf8"));
  fs.mkdirSync(outDir, { recursive: true });

  const { ElevenLabsClient } = await import("elevenlabs");
  const client = new ElevenLabsClient({ apiKey });

  const total = phrases.length;
  let generated = 0;
  let skipped = 0;
  let failed = 0;
  let charsBilled = 0;

  console.log(`FlowBag audio generation — ${total} phrases\n`);

  for (let i = 0; i < phrases.length; i++) {
    const { id, text } = phrases[i];
    const outPath = path.join(outDir, `${id}.mp3`);
    const n = i + 1;

    if (!id || !text?.trim()) {
      console.warn(`Skipped ${n}/${total}: invalid entry (missing id or text)`);
      failed += 1;
      continue;
    }

    if (fs.existsSync(outPath)) {
      console.log(`Skipped ${n}/${total}: ${id}.mp3 (exists)`);
      skipped += 1;
      continue;
    }

    try {
      const stream = await client.textToSpeech.convert(voiceId, {
        text: text.trim(),
        model_id: "eleven_turbo_v2_5",
        voice_settings: VOICE_SETTINGS,
      });
      const buffer = await streamToBuffer(stream);
      fs.writeFileSync(outPath, buffer);
      generated += 1;
      charsBilled += text.trim().length;
      console.log(`Generated ${n}/${total}: ${id}.mp3`);
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Failed ${n}/${total}: ${id}.mp3 — ${msg}`);
    }

    await sleep(300);
  }

  const costUsd = charsBilled * COST_PER_CHAR_USD;

  console.log("\n--- Summary ---");
  console.log(`Generated: ${generated}`);
  console.log(`Skipped (already exist): ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Characters billed this run: ${charsBilled}`);
  console.log(`Estimated cost this run: $${costUsd.toFixed(2)} USD`);
  console.log(`Output: ${outDir}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
