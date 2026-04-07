/**
 * PreToolUse hook for the Rayburst plugin.
 *
 * Triggered on Write and Edit tool calls. Reads the active feature
 * from cache and injects a coding reminder with criteria checklist.
 */

import { readCache } from "./rb-cache.js";
import { buildCodingReminderBlock, buildNoFeatureWarningBlock } from "./product-context-block.js";
import type { Feature } from "./types.js";

// Read stdin for the hook input
let input = "";
try {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  input = Buffer.concat(chunks).toString("utf-8");
} catch {
  process.exit(0);
}

let hookInput: { input?: { tool_name?: string; tool_input?: { file_path?: string; path?: string } } };
try {
  hookInput = JSON.parse(input) as typeof hookInput;
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
const activeFeature = readCache<Feature>("active-feature");
const filePath = toolInput?.file_path || toolInput?.path || "";

if (activeFeature) {
  // Check if other features mention this file path (basic matching)
  const featureList = readCache<Feature[]>("features") || [];
  const relatedFeatures: Feature[] = [];

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

  // Inject the Coding Reminder Block as additionalContext
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
} else {
  // No active feature matched — hard block the write until the user
  // confirms a feature. A warning-only response is not sufficient because
  // the assistant can choose to ignore it; a block forces resolution.
  const reason = buildNoFeatureWarningBlock(filePath);
  console.log(
    JSON.stringify({
      decision: "block",
      reason,
    })
  );
  process.exit(0);
}
