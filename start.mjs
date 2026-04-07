#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const originalCwd = process.cwd();
process.chdir(__dirname);

if (!process.env.CLAUDE_PROJECT_DIR) {
  process.env.CLAUDE_PROJECT_DIR = originalCwd;
}

// Ensure dependencies are installed
if (!existsSync(resolve(__dirname, "node_modules", "@modelcontextprotocol"))) {
  try {
    execSync("npm install --no-package-lock --no-save --silent", {
      cwd: __dirname,
      stdio: "pipe",
      timeout: 120000,
    });
  } catch {
    /* best effort */
  }
}

// Bundle exists (built) — start instantly
if (existsSync(resolve(__dirname, "server.bundle.mjs"))) {
  await import("./server.bundle.mjs");
} else {
  // Dev mode — run from source via tsx
  if (!existsSync(resolve(__dirname, "node_modules"))) {
    try {
      execSync("npm install --silent", {
        cwd: __dirname,
        stdio: "pipe",
        timeout: 60000,
      });
    } catch {
      /* best effort */
    }
  }
  await import("./src/server.ts");
}
