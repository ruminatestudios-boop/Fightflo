#!/usr/bin/env node
/**
 * Stable local dev entrypoint:
 * - Ensures only one server owns port 3001 (duplicate `npm run dev` causes chunk errors)
 * - Optional --clean wipe of .next when webpack cache is corrupted
 */
import { spawn, execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.PORT ?? "3001";
const clean = process.argv.includes("--clean");

function pidsOnPort(p) {
  try {
    return execSync(`lsof -ti:${p}`, { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((id) => Number(id))
      .filter((id) => !Number.isNaN(id) && id !== process.pid);
  } catch {
    return [];
  }
}

function killPort(p) {
  const pids = pidsOnPort(p);
  if (pids.length === 0) return;

  console.log(`Stopping existing process(es) on port ${p}: ${pids.join(", ")}`);
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      /* already gone */
    }
  }

  const deadline = Date.now() + 2000;
  while (Date.now() < deadline && pidsOnPort(p).length > 0) {
    execSync("sleep 0.1");
  }

  for (const pid of pidsOnPort(p)) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      /* already gone */
    }
  }
}

if (clean) {
  const nextDir = join(root, ".next");
  if (existsSync(nextDir)) {
    rmSync(nextDir, { recursive: true, force: true });
    console.log("Cleared feedback/.next");
  }
}

killPort(port);

const child = spawn("next", ["dev", "--port", port], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
