#!/usr/bin/env node
/** Warn when production build runs while dev server still owns port 3001. */
import { execSync } from "node:child_process";

const port = process.env.PORT ?? "3001";

try {
  const pids = execSync(`lsof -ti:${port}`, { encoding: "utf8" }).trim();
  if (!pids) process.exit(0);

  console.warn(
    [
      "",
      `⚠️  Port ${port} is in use (pid ${pids.replace(/\n/g, ", ")}).`,
      "   Running \`npm run build\` while \`npm run dev\` is active corrupts .next",
      "   and causes errors like: Cannot find module './948.js'",
      "",
      "   Stop dev first (Ctrl+C), or run: npm run dev:clean",
      "",
    ].join("\n")
  );
} catch {
  /* port free */
}
