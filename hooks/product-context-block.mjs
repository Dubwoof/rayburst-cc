/**
 * XML block builders for Rayburst hook context injection.
 */

/**
 * Build the main Product Context Block injected at session start.
 * Contains rules, feature atlas summary, and board summary.
 */
export function buildProductContextBlock(features, cards) {
  const featureList = Array.isArray(features) ? features : features?.data ?? [];
  const cardList = Array.isArray(cards) ? cards : cards?.data ?? [];

  // Count features by status
  const counts = { draft: 0, active: 0, completed: 0, archived: 0 };
  for (const f of featureList) {
    counts[f.status || "draft"] = (counts[f.status || "draft"] || 0) + 1;
  }
  const total = featureList.length;

  // Count cards by status
  const cardCounts = {};
  for (const c of cardList) {
    cardCounts[c.status || "draft"] = (cardCounts[c.status || "draft"] || 0) + 1;
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
    <rule>Before implementing any task, check if a matching feature exists in the atlas below. If found, read its criteria with rb_get_feature and work against them.</rule>
    <rule>If your changes may affect behaviors described in OTHER features' criteria, flag this to the user before proceeding.</rule>
    <rule>NEVER create, update, or delete features or criteria in the atlas without explicitly asking the user for confirmation first. Show them what you want to change and wait for approval.</rule>
    <rule>When implementation is complete, summarize which acceptance criteria were addressed and which remain pending.</rule>
    <rule>Use mcp__plugin_rayburst_rayburst__rb_* MCP tools to interact with the atlas. Use rb_get_feature to load full criteria for a specific feature.</rule>
  </rules>

  <atlas summary="${total} features (${counts.draft} draft, ${counts.active} active, ${counts.completed} completed)">
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
export function buildActiveFeatureBlock(features) {
  if (!features || features.length === 0) return "";

  const featureBlocks = features.map((f) => {
    const criteria = (f.criteria || [])
      .map((c) => {
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
  <guidance>Work against these acceptance criteria. When done, summarize which criteria your changes address and which remain.</guidance>
</rayburst_active_feature>`;
}

/**
 * Build the Coding Reminder Block injected before Write/Edit calls.
 */
export function buildCodingReminderBlock(activeFeature, filePath, relatedFeatures) {
  if (!activeFeature) return "";

  const criteria = (activeFeature.criteria || [])
    .map((c) => `  - [ ] ${escapeXml(c.title || c.description || "")}`)
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
</rayburst_coding_reminder>`;
}

function escapeXml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
