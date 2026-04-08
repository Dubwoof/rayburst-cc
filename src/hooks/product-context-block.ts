/**
 * XML block builders for Rayburst hook context injection.
 */

import type { Feature, Card, Criterion } from "./types.js";

/**
 * Build the main Product Context Block injected at session start.
 * Contains rules, feature atlas summary, and board summary.
 */
export function buildProductContextBlock(features: Feature[], cards: Card[]): string {
  const featureList = Array.isArray(features) ? features : (features as unknown as { data?: Feature[] })?.data ?? [];
  const cardList = Array.isArray(cards) ? cards : (cards as unknown as { data?: Card[] })?.data ?? [];

  // Count features by status
  const counts: Record<string, number> = { draft: 0, active: 0, completed: 0, archived: 0 };
  for (const f of featureList) {
    const status = f.status || "draft";
    counts[status] = (counts[status] || 0) + 1;
  }
  const total = featureList.length;

  // Count cards by status
  const cardCounts: Record<string, number> = {};
  for (const c of cardList) {
    const status = c.status || "draft";
    cardCounts[status] = (cardCounts[status] || 0) + 1;
  }

  // Build feature lines (compact: one line each)
  const featureLines = featureList
    .slice(0, 60)
    .map((f) => {
      const critCount = f.criteriaCount ?? f.criteria?.length ?? "?";
      return `    <feature id="${f.id}" status="${f.status}" criteria="${critCount}">${escapeXml(f.title)}</feature>`;
    })
    .join("\n");

  const truncated =
    featureList.length > 60
      ? `\n    <truncated shown="60" total="${featureList.length}"/>`
      : "";

  // Build card lines
  const activeCards = cardList.filter(
    (c) => c.status === "in-progress" || c.status === "validation" || c.status === "ready"
  );
  const cardLines = activeCards
    .slice(0, 20)
    .map((c) => {
      const featureIds = (c.features || []).map((f) => f.id || f).join(",");
      return `    <card id="${c.id}" status="${c.status}" features="${featureIds}">${escapeXml(c.title)}</card>`;
    })
    .join("\n");

  return `<rayburst_product_context>
  <rules>
    <rule>You have access to a Rayburst feature atlas — a knowledge graph of product features with Gherkin acceptance criteria. Use it to understand what you're building.</rule>
    <rule>MANDATORY PRE-IMPLEMENTATION STEP: Before writing ANY code — regardless of task size, type, or complexity (including visual changes, icon swaps, layout tweaks, styling, refactoring) — you MUST: (1) call rb_list_features to search for a matching feature, (2) call rb_get_feature to load its criteria, (3) work against those criteria. There are NO exceptions. If no feature exists, create one with rb_create_feature before proceeding.</rule>
    <rule>PREFER EXISTING FEATURES: When adding criteria, ALWAYS search for an existing feature first via rb_list_features. Add criteria to the best-matching existing feature rather than creating a new one. Only create a new feature when no existing feature covers the UI area or capability.</rule>
    <rule>FEATURE NAMING: Feature titles MUST be short, user-friendly UI area names like "Header", "Poster Slider", "Settings Page", "Login Screen", "Featured Row". NEVER use requirement descriptions as titles (e.g. NOT "Implement dark mode toggle on settings page").</rule>
    <rule>GHERKIN FORMAT: All criteria descriptions MUST use Gherkin syntax with Given, When, Then each on a NEW LINE. Example:
Given the user is on the home screen
When they tap the favorites button
Then the favorites filter is applied</rule>
    <rule>TAGS: Every feature MUST have at least one tag assigned. Use rb_list_tags to see available tags, or rb_create_tag if needed. Assign tags via the feature's tagIds when creating or updating.</rule>
    <rule>If your changes may affect behaviors described in OTHER features' criteria, flag this to the user before proceeding.</rule>
    <rule>NEVER create, update, or delete features or criteria in the atlas without explicitly asking the user for confirmation first. Show them what you want to change and wait for approval.</rule>
    <rule>MANDATORY POST-IMPLEMENTATION STEP: After every implementation — in the same response as the code changes — you MUST update Rayburst without being asked: (1) update affected feature descriptions if behavior changed via rb_update_feature, (2) add new acceptance criteria for every new behavior introduced via rb_add_criterion (Gherkin format, Given/When/Then on separate lines), (3) update criterion status where applicable via rb_update_criterion. Do NOT wait for the user to ask. A post-write hook will verify compliance.</rule>
    <rule>Use mcp__plugin_rayburst_rayburst__rb_* MCP tools to interact with the atlas. Use rb_get_feature to load full criteria for a specific feature.</rule>
  </rules>

  <atlas summary="${total} features (${counts["draft"]} draft, ${counts["active"]} active, ${counts["completed"]} completed)">
${featureLines}${truncated}
  </atlas>

  <board summary="${cardList.length} cards — ${cardCounts["in-progress"] || 0} in-progress, ${cardCounts["validation"] || 0} validation, ${cardCounts["done"] || 0} done">
${cardLines}
  </board>
</rayburst_product_context>`;
}

/**
 * Build the Active Feature Block injected when a user prompt matches a feature.
 * Contains full criteria for the matched feature(s).
 */
export function buildActiveFeatureBlock(features: Feature[]): string {
  if (!features || features.length === 0) return "";

  const featureBlocks = features.map((f) => {
    const criteria = (f.criteria || [])
      .map((c: Criterion) => {
        return `    <criterion id="${c.id}" status="${c.status}">${escapeXml(c.title || "")} — ${escapeXml(c.description || "")}</criterion>`;
      })
      .join("\n");

    return `  <feature id="${f.id}" title="${escapeXml(f.title)}" status="${f.status}">
    <description>${escapeXml(f.description || "")}</description>
${criteria}
  </feature>`;
  });

  return `<rayburst_active_feature>
${featureBlocks.join("\n")}
  <guidance>Work against these acceptance criteria. You will be required to update the Rayburst feature atlas immediately after writing code — a post-write reminder will enforce this. (1) call rb_update_criterion or rb_add_criterion to reflect what was built — write criteria in Gherkin format with Given/When/Then each on a new line, (2) call rb_update_feature if the description needs updating, (3) summarize which criteria your changes address and which remain. ALWAYS add criteria to existing features rather than creating new ones.</guidance>
</rayburst_active_feature>`;
}

/**
 * Build the Coding Reminder Block injected before Write/Edit calls.
 */
export function buildCodingReminderBlock(
  activeFeature: Feature,
  filePath: string,
  relatedFeatures: Feature[]
): string {
  if (!activeFeature) return "";

  const criteria = (activeFeature.criteria || [])
    .map((c: Criterion) => `  - [ ] ${escapeXml(c.title || c.description || "")}`)
    .join("\n");

  let relatedNote = "";
  if (relatedFeatures && relatedFeatures.length > 0) {
    const names = relatedFeatures
      .map((f) => `"${escapeXml(f.title)}"`)
      .join(", ");
    relatedNote = `\n  <related_features>This file may also relate to: ${names}. Check that your changes don't break their criteria.</related_features>`;
  }

  return `<rayburst_coding_reminder>
  <active_feature>${escapeXml(activeFeature.title)} (${activeFeature.id})</active_feature>
  <criteria_checklist>
${criteria}
  </criteria_checklist>
  <file>${escapeXml(filePath || "unknown")}</file>${relatedNote}
  <post_implementation_required>Before submitting your response, you MUST update the Rayburst feature atlas: add/update criteria for any new behaviors via rb_add_criterion, update the feature description if it changed via rb_update_feature. You will be reminded again after writing. Do NOT skip this step.</post_implementation_required>
</rayburst_coding_reminder>`;
}

/**
 * Build a warning block when no feature was matched but code is being written.
 * Reminds the assistant to search the atlas before proceeding.
 */
export function buildNoFeatureWarningBlock(filePath: string): string {
  return `<rayburst_no_feature_warning>
  <warning>You are about to modify ${escapeXml(filePath || "a file")} but NO feature from the Rayburst atlas was matched to your current task. This means you skipped the mandatory feature lookup step.</warning>
  <required_action>BEFORE writing this code, you MUST:
    1. Call rb_list_features to find an existing feature that covers the area you are changing — ALWAYS prefer adding criteria to existing features over creating new ones
    2. Call rb_get_feature on the best match to load its acceptance criteria
    3. Work against those criteria — write any new criteria in Gherkin format with Given/When/Then on separate lines
  ALL changes — including visual, layout, icon, and styling changes — require a feature lookup. There are no exceptions.</required_action>
</rayburst_no_feature_warning>`;
}

/**
 * Build a block injected at session start when the atlas is empty.
 * Makes it explicit that features must be created before any coding begins.
 */
export function buildEmptyAtlasBlock(): string {
  return `<rayburst_empty_atlas>
  <warning>The Rayburst feature atlas appears EMPTY — the session-start fetch returned no features. This may mean no features exist yet, OR that a config/API issue prevented loading them.</warning>
  <required_action>You MUST NOT write or edit any code this session until you have verified the atlas and registered the feature you are implementing.
    1. Call rb_list_features (with an empty or broad search term) to verify the atlas is truly empty — do NOT skip this step even if the summary says 0 features
    2. If features exist, call rb_get_feature on the best match and work against its criteria
    3. If the atlas is genuinely empty, ask the user what feature or behavior you are about to implement
    4. Call rb_create_feature with a short, user-friendly UI area name (e.g. "Header", "Settings Page" — NOT a requirement description)
    5. Add acceptance criteria via rb_add_criterion in Gherkin format with Given/When/Then on separate lines
    6. Assign at least one tag via rb_list_tags / rb_create_tag
    7. Only then proceed with implementation
  This applies to ALL changes — bug fixes, refactors, visual tweaks, and new features alike. There are no exceptions.</required_action>
</rayburst_empty_atlas>`;
}

function escapeXml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
