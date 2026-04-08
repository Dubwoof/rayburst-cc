/**
 * PostToolUse hook for the Rayburst plugin.
 *
 * Triggered after Write and Edit tool calls. Reads the active feature
 * from cache and injects a mandatory reminder to update the feature atlas.
 */

import { readCache } from "./rb-cache.js";
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

const activeFeature = readCache<Feature>("active-feature");
const filePath = toolInput?.file_path || toolInput?.path || "unknown";

function escapeXml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let contextBlock: string;

if (activeFeature) {
  contextBlock = `<rayburst_post_implementation_reminder>
  <action_required>You just modified ${escapeXml(filePath)}. Before continuing to the next task or responding to the user, you MUST update the Rayburst feature atlas NOW:
    1. Search for an existing feature that covers this area via rb_list_features — add criteria there instead of creating a new feature
    2. Call rb_add_criterion for new behaviors (Gherkin format: Given/When/Then on separate lines)
    3. Call rb_update_criterion to mark criteria as passing/failing
    4. Call rb_update_feature if the feature description needs updating
  Do NOT proceed without completing this step. This is a mandatory workflow requirement.</action_required>
  <active_feature>${escapeXml(activeFeature.title)} (${activeFeature.id})</active_feature>
</rayburst_post_implementation_reminder>`;
} else {
  contextBlock = `<rayburst_post_implementation_reminder>
  <action_required>You just modified ${escapeXml(filePath)} but NO active feature was matched for this task. This likely means you skipped the mandatory feature lookup step. You MUST now:
    1. Call rb_list_features to find an existing feature that covers this area — prefer adding criteria to existing features over creating new ones
    2. Call rb_get_feature on the best match to load its criteria
    3. Call rb_add_criterion to reflect what you built (Gherkin format: Given/When/Then on separate lines)
    4. Call rb_update_feature if the feature description needs updating
  ALL changes — including visual, layout, and icon changes — require feature atlas updates. Do NOT skip this.</action_required>
</rayburst_post_implementation_reminder>`;
}

console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: contextBlock,
    },
  })
);
