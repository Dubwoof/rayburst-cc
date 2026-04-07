#!/usr/bin/env node

/**
 * SessionStart hook for the Rayburst plugin.
 *
 * Fetches features + cards from the Rayburst API and injects a
 * Product Context Block as additionalContext. Also writes a feature
 * cache for UserPromptSubmit and PreToolUse hooks to read.
 */

import { readConfig, mcpCall, extractData, writeCache } from "./rb-cache.mjs";
import { buildProductContextBlock } from "./product-context-block.mjs";

const config = readConfig();

// Exit silently if no config — user hasn't run /rb:setup yet
if (!config || !config.apiKey) {
  process.exit(0);
}

try {
  // Fetch features and cards in parallel
  const [featuresRaw, cardsRaw] = await Promise.all([
    mcpCall(config, "list_features", { limit: 100 }),
    config.boardId
      ? mcpCall(config, "list_cards", { boardId: config.boardId })
      : Promise.resolve(null),
  ]);

  const features = extractData(featuresRaw);
  const cards = extractData(cardsRaw);

  if (!features) {
    // API unreachable — exit silently
    process.exit(0);
  }

  const featureList = Array.isArray(features) ? features : features?.data ?? [];
  const cardList = Array.isArray(cards) ? cards : cards?.data ?? [];

  // Write feature cache for downstream hooks
  writeCache("features", featureList);

  // Build and inject the Product Context Block
  const contextBlock = buildProductContextBlock(featureList, cardList);

  // Output as JSON for Claude Code hook system
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: contextBlock,
      },
    })
  );
} catch {
  // Silent failure — don't block session startup
  process.exit(0);
}
