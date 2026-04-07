#!/usr/bin/env node

/**
 * PreToolUse hook for the Rayburst plugin.
 *
 * Triggered on Write and Edit tool calls. Reads the active feature
 * from cache and injects a coding reminder with criteria checklist.
 */

import { readCache } from "./rb-cache.mjs";
import { buildCodingReminderBlock } from "./product-context-block.mjs";

// Read stdin for the hook input
let input = "";
try {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  input = Buffer.concat(chunks).toString("utf-8");
} catch {
  process.exit(0);
}

let hookInput;
try {
  hookInput = JSON.parse(input);
} catch {
  process.exit(0);
}

const toolName = hookInput?.input?.tool_name;
const toolInput = hookInput?.input?.tool_input;

// Only act on Write and Edit
if (toolName !== "Write" && toolName !== "Edit") {
  process.exit(0);
}

// Read active feature from cache
const activeFeature = readCache("active-feature");
if (!activeFeature) {
  process.exit(0);
}

// Get the file path being edited
const filePath = toolInput?.file_path || toolInput?.path || "";

// Check if other features mention this file path (basic matching)
const featureList = readCache("features") || [];
const relatedFeatures = [];

if (filePath) {
  const fileBasename = filePath.split("/").pop() || "";
  const fileDir = filePath.split("/").slice(-2, -1)[0] || "";

  for (const f of featureList) {
    if (f.id === activeFeature.id) continue;
    const desc = (f.description || "").toLowerCase();
    const title = (f.title || "").toLowerCase();
    if (
      desc.includes(fileBasename.toLowerCase()) ||
      desc.includes(fileDir.toLowerCase()) ||
      title.includes(fileBasename.toLowerCase().replace(/\.\w+$/, ""))
    ) {
      relatedFeatures.push(f);
    }
  }
}

// Build and inject the Coding Reminder Block
const contextBlock = buildCodingReminderBlock(
  activeFeature,
  filePath,
  relatedFeatures.slice(0, 3)
);

if (contextBlock) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: contextBlock,
      },
    })
  );
}
