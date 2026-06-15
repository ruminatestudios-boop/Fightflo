#!/usr/bin/env node
/**
 * Verify Feedback full-analysis setup.
 * Run: npm run verify-setup
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const envPath = join(root, ".env");

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error("❌ feedback/.env not found — copy from .env.example");
    process.exit(1);
  }
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "GEMINI_API_KEY",
];

function check(name, ok, detail = "") {
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

async function main() {
  loadEnv();
  console.log("\nFeedback — full analysis setup check\n");

  let allOk = true;

  for (const key of REQUIRED) {
    const ok = Boolean(process.env[key]?.trim());
    allOk = check(key, ok, ok ? "set" : "missing") && allOk;
  }

  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
    check("FFmpeg", true, "installed");
  } catch {
    try {
      execSync("$HOME/bin/ffmpeg -version", { stdio: "ignore", shell: "/bin/zsh" });
      check("FFmpeg", true, "installed (~/bin)");
    } catch {
      try {
        const ffmpegStatic = (await import("ffmpeg-static")).default;
        if (ffmpegStatic) {
          execSync(`"${ffmpegStatic}" -version`, { stdio: "ignore" });
          check("FFmpeg", true, "bundled (ffmpeg-static)");
        } else {
          throw new Error("no path");
        }
      } catch {
        allOk =
          check(
            "FFmpeg",
            false,
            "run: brew install ffmpeg, add ~/bin/ffmpeg, or npm install ffmpeg-static"
          ) && allOk;
      }
    }
  }

  try {
    execSync("ffprobe -version", { stdio: "ignore" });
    check("FFprobe", true, "installed");
  } catch {
    try {
      execSync("$HOME/bin/ffprobe -version", { stdio: "ignore", shell: "/bin/zsh" });
      check("FFprobe", true, "installed (~/bin)");
    } catch {
      check(
        "FFprobe",
        true,
        "optional — video probe uses ffmpeg -i when ffprobe is missing"
      );
    }
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const res = await fetch(`${url}/rest/v1/users?select=id&limit=1`, {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });
      if (res.status === 404 || res.status === 406) {
        check("Supabase schema", false, "run lib/db/schema.sql in SQL editor");
        allOk = false;
      } else if (res.ok || res.status === 200) {
        check("Supabase connection", true);
      } else {
        const text = await res.text();
        check("Supabase connection", false, `${res.status} ${text.slice(0, 80)}`);
        allOk = false;
      }
    } catch (e) {
      check("Supabase connection", false, e.message);
      allOk = false;
    }
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const modelName = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
      const model = genAI.getGenerativeModel({ model: modelName });
      await model.generateContent("Reply OK");
      check("Gemini API", true, `working (${modelName})`);
    } catch (e) {
      check("Gemini API", false, e.message ?? "request failed");
      allOk = false;
    }
  }

  console.log("\n" + (allOk ? "All checks passed — rebuild and restart:" : "Fix items above, then:"));
  console.log("  cd feedback && npm run build && npm run start\n");
  process.exit(allOk ? 0 : 1);
}

main();
