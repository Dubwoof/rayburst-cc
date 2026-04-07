/**
 * UserPromptSubmit hook for the Rayburst plugin.
 *
 * Captures every user message, matches it against cached features,
 * and injects the matched feature's full criteria as additionalContext.
 */

import { readConfig, readCache, writeCache, matchFeatures, mcpCall, extractData } from "./rb-cache.js";
import { buildActiveFeatureBlock } from "./product-context-block.js";
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

let hookInput: { input?: { prompt?: string } };
try {
  hookInput = JSON.parse(input) as { input?: { prompt?: string } };
} catch {
  process.exit(0);
}

const prompt = hookInput?.input?.prompt;
if (!prompt || typeof prompt !== "string") {
  process.exit(0);
}

const config = readConfig();
if (!config || !config.apiKey) {
  process.exit(0);
}

// Read cached features from SessionStart
const featureList = readCache<Feature[]>("features");
if (!featureList || featureList.length === 0) {
  process.exit(0);
}

// Match prompt against features
const matches = matchFeatures(prompt, featureList);
if (matches.length === 0) {
  // Clear any stale active feature
  writeCache("active-feature", null);
  process.exit(0);
}

try {
  // Fetch full criteria for matched features (up to 3)
  const detailed = await Promise.all(
    matches.map(async (f) => {
      const raw = await mcpCall(config, "get_feature", { featureId: f.id });
      const data = extractData(raw);
      return (data as Feature) || f;
    })
  );

  // Write active feature cache for PreToolUse
  writeCache("active-feature", detailed[0]);

  // Build and inject the Active Feature Block
  const contextBlock = buildActiveFeatureBlock(detailed);

  if (contextBlock) {
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: contextBlock,
        },
      })
    );
  }
} catch {
  process.exit(0);
}
