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

// src/hooks/product-context-block.ts
function buildCodingReminderBlock(activeFeature2, filePath2, relatedFeatures) {
  if (!activeFeature2) return "";
  const criteria = (activeFeature2.criteria || []).map((c) => `  - [ ] ${escapeXml(c.title || c.description || "")}`).join("\n");
  let relatedNote = "";
  if (relatedFeatures && relatedFeatures.length > 0) {
    const names = relatedFeatures.map((f) => `"${escapeXml(f.title)}"`).join(", ");
    relatedNote = `
  <related_features>This file may also relate to: ${names}. Check that your changes don't break their criteria.</related_features>`;
  }
  return `<rayburst_coding_reminder>
  <active_feature>${escapeXml(activeFeature2.title)} (${activeFeature2.id})</active_feature>
  <criteria_checklist>
${criteria}
  </criteria_checklist>
  <file>${escapeXml(filePath2 || "unknown")}</file>${relatedNote}
  <post_implementation_required>Before submitting your response, you MUST update the Rayburst feature atlas: add/update criteria for any new behaviors via rb_add_criterion, update the feature description if it changed via rb_update_feature. You will be reminded again after writing. Do NOT skip this step.</post_implementation_required>
</rayburst_coding_reminder>`;
}
function buildNoFeatureWarningBlock(filePath2) {
  return `<rayburst_no_feature_warning>
  <warning>You are about to modify ${escapeXml(filePath2 || "a file")} but NO feature from the Rayburst atlas was matched to your current task. This means you skipped the mandatory feature lookup step.</warning>
  <required_action>BEFORE writing this code, you MUST:
    1. Call rb_list_features to find an existing feature that covers the area you are changing \u2014 ALWAYS prefer adding criteria to existing features over creating new ones
    2. Call rb_get_feature on the best match to load its acceptance criteria
    3. Work against those criteria \u2014 write any new criteria in Gherkin format with Given/When/Then on separate lines
  ALL changes \u2014 including visual, layout, icon, and styling changes \u2014 require a feature lookup. There are no exceptions.</required_action>
</rayburst_no_feature_warning>`;
}
function escapeXml(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// src/hooks/pretooluse.ts
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
var filePath = toolInput?.file_path || toolInput?.path || "";
if (activeFeature) {
  const featureList = readCache("features") || [];
  const relatedFeatures = [];
  if (filePath) {
    const fileBasename = filePath.split("/").pop() || "";
    const fileDir = filePath.split("/").slice(-2, -1)[0] || "";
    for (const f of featureList) {
      if (f.id === activeFeature.id) continue;
      const desc = (f.description || "").toLowerCase();
      const title = (f.title || "").toLowerCase();
      if (desc.includes(fileBasename.toLowerCase()) || desc.includes(fileDir.toLowerCase()) || title.includes(fileBasename.toLowerCase().replace(/\.\w+$/, ""))) {
        relatedFeatures.push(f);
      }
    }
  }
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
          additionalContext: contextBlock
        }
      })
    );
  }
} else {
  const reason = buildNoFeatureWarningBlock(filePath);
  console.log(
    JSON.stringify({
      decision: "block",
      reason
    })
  );
  process.exit(0);
}
