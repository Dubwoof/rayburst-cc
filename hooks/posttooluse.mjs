#!/usr/bin/env node

// src/hooks/rb-cache.ts
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
function getProjectDir() {
  return process.env["CLAUDE_PROJECT_DIR"] || process.env["CONTEXT_MODE_PROJECT_DIR"] || process.cwd();
}
function getProjectHash() {
  return createHash("md5").update(getProjectDir()).digest("hex").slice(0, 12);
}
function getCachePath(type) {
  return `/tmp/rb-${type}-${getProjectHash()}.json`;
}
function readCache(type) {
  try {
    const path = getCachePath(type);
    if (!existsSync(path)) return null;
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// src/hooks/posttooluse.ts
var input = "";
try {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  input = Buffer.concat(chunks).toString("utf-8");
} catch {
  process.exit(0);
}
var hookInput;
try {
  hookInput = JSON.parse(input);
} catch {
  process.exit(0);
}
var toolName = hookInput?.input?.tool_name;
var toolInput = hookInput?.input?.tool_input;
if (toolName !== "Write" && toolName !== "Edit") {
  process.exit(0);
}
var activeFeature = readCache("active-feature");
if (!activeFeature) {
  process.exit(0);
}
var filePath = toolInput?.file_path || toolInput?.path || "unknown";
function escapeXml(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
var contextBlock = `<rayburst_post_implementation_reminder>
  <action_required>You just modified ${escapeXml(filePath)}. Before continuing to the next task or responding to the user, you MUST update the Rayburst feature atlas NOW:
    1. Call rb_add_criterion for any new behaviors introduced
    2. Call rb_update_criterion to mark criteria as passing/failing
    3. Call rb_update_feature if the feature description needs updating
  Do NOT proceed without completing this step. This is a mandatory workflow requirement.</action_required>
  <active_feature>${escapeXml(activeFeature.title)} (${activeFeature.id})</active_feature>
</rayburst_post_implementation_reminder>`;
console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: contextBlock
    }
  })
);
