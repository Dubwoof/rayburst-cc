#!/usr/bin/env node

// src/hooks/rb-cache.ts
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
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
function writeCache(type, data) {
  try {
    const path = getCachePath(type);
    writeFileSync(path, JSON.stringify(data), "utf-8");
  } catch {
  }
}
function readConfig() {
  const projectDir = getProjectDir();
  const configPath = resolve(projectDir, ".claude", "rb-config.md");
  if (!existsSync(configPath)) return null;
  const content = readFileSync(configPath, "utf-8");
  function parseField(section, key) {
    const sectionMatch = content.match(
      new RegExp(`## ${section}[\\s\\S]*?(?=\\n## |$)`)
    );
    if (!sectionMatch) return null;
    if (key) {
      const lineMatch = sectionMatch[0].match(
        new RegExp(`-\\s*${key}:\\s*(.+)`, "i")
      );
      if (lineMatch) return lineMatch[1].trim();
    }
    const lines = sectionMatch[0].split("\n").filter((l) => l.trim() && !l.startsWith("#"));
    return lines[0]?.trim() || null;
  }
  const apiKey = process.env["RAYBURST_API_KEY"] || parseField("API", "API Key");
  const apiUrl = process.env["RAYBURST_API_URL"] || parseField("API", "API URL") || "https://api.rayburst.app/api/v1/mcp";
  const agentId = process.env["RAYBURST_AGENT_ID"];
  const boardId = parseField("Board", "ID");
  const boardSlug = parseField("Board", "Slug");
  const frontendProjectId = parseField("Projects", "Frontend");
  const backendProjectId = parseField("Projects", "Backend");
  const projectUrl = parseField("Project URL", null);
  if (!apiKey) return null;
  return {
    apiKey,
    apiUrl,
    agentId: agentId || void 0,
    boardId: boardId || void 0,
    boardSlug: boardSlug || void 0,
    frontendProjectId: frontendProjectId || void 0,
    backendProjectId: backendProjectId || void 0,
    projectUrl: projectUrl || void 0
  };
}
var requestId = 0;
async function mcpCall(config2, toolName, args = {}) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    Authorization: `Bearer ${config2.apiKey}`
  };
  if (config2.agentId) headers["X-Agent-Id"] = config2.agentId;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3e3);
  try {
    const res = await fetch(config2.apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: ++requestId,
        method: "tools/call",
        params: { name: toolName, arguments: args }
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("text/event-stream")) {
      const text = await res.text();
      const lines = text.split("\n");
      let lastData = null;
      for (const line of lines) {
        if (line.startsWith("data: ")) lastData = line.slice(6);
      }
      if (!lastData) return null;
      try {
        const parsed = JSON.parse(lastData);
        return parsed.result ?? parsed;
      } catch {
        return null;
      }
    }
    const json = await res.json();
    return json.result ?? json;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}
function extractData(result) {
  if (!result) return null;
  const r = result;
  if (r.content && Array.isArray(r.content)) {
    const textItem = r.content.find((c) => c.type === "text");
    if (textItem) {
      try {
        return JSON.parse(textItem.text);
      } catch {
        return textItem.text;
      }
    }
  }
  return result;
}

// src/hooks/product-context-block.ts
function buildProductContextBlock(features, cards) {
  const featureList = Array.isArray(features) ? features : features?.data ?? [];
  const cardList = Array.isArray(cards) ? cards : cards?.data ?? [];
  const counts = { draft: 0, active: 0, completed: 0, archived: 0 };
  for (const f of featureList) {
    const status = f.status || "draft";
    counts[status] = (counts[status] || 0) + 1;
  }
  const total = featureList.length;
  const cardCounts = {};
  for (const c of cardList) {
    const status = c.status || "draft";
    cardCounts[status] = (cardCounts[status] || 0) + 1;
  }
  const featureLines = featureList.slice(0, 60).map((f) => {
    const critCount = f.criteriaCount ?? f.criteria?.length ?? "?";
    return `    <feature id="${f.id}" status="${f.status}" criteria="${critCount}">${escapeXml(f.title)}</feature>`;
  }).join("\n");
  const truncated = featureList.length > 60 ? `
    <truncated shown="60" total="${featureList.length}"/>` : "";
  const activeCards = cardList.filter(
    (c) => c.status === "in-progress" || c.status === "validation" || c.status === "ready"
  );
  const cardLines = activeCards.slice(0, 20).map((c) => {
    const featureIds = (c.features || []).map((f) => f.id || f).join(",");
    return `    <card id="${c.id}" status="${c.status}" features="${featureIds}">${escapeXml(c.title)}</card>`;
  }).join("\n");
  return `<rayburst_product_context>
  <rules>
    <rule>You have access to a Rayburst feature atlas \u2014 a knowledge graph of product features with Gherkin acceptance criteria. Use it to understand what you're building.</rule>
    <rule>Before implementing any task, check if a matching feature exists in the atlas below. If found, read its criteria with rb_get_feature and work against them.</rule>
    <rule>If your changes may affect behaviors described in OTHER features' criteria, flag this to the user before proceeding.</rule>
    <rule>NEVER create, update, or delete features or criteria in the atlas without explicitly asking the user for confirmation first. Show them what you want to change and wait for approval.</rule>
    <rule>When implementation is complete, summarize which acceptance criteria were addressed and which remain pending.</rule>
    <rule>MANDATORY: After every implementation \u2014 in the same response as the code changes \u2014 you MUST update Rayburst without being asked: (1) update affected feature descriptions if behavior changed via rb_update_feature, (2) add new acceptance criteria for every new behavior introduced via rb_add_criterion, (3) update criterion status where applicable via rb_update_criterion. Do NOT wait for the user to ask. Skipping this step is a workflow violation.</rule>
    <rule>Use mcp__plugin_rayburst_rayburst__rb_* MCP tools to interact with the atlas. Use rb_get_feature to load full criteria for a specific feature.</rule>
  </rules>

  <atlas summary="${total} features (${counts["draft"]} draft, ${counts["active"]} active, ${counts["completed"]} completed)">
${featureLines}${truncated}
  </atlas>

  <board summary="${cardList.length} cards \u2014 ${cardCounts["in-progress"] || 0} in-progress, ${cardCounts["validation"] || 0} validation, ${cardCounts["done"] || 0} done">
${cardLines}
  </board>
</rayburst_product_context>`;
}
function escapeXml(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// src/hooks/sessionstart.ts
var config = readConfig();
if (!config || !config.apiKey) {
  process.exit(0);
}
try {
  const [featuresRaw, cardsRaw] = await Promise.all([
    mcpCall(config, "list_features", { limit: 100 }),
    config.boardId ? mcpCall(config, "list_cards", { boardId: config.boardId }) : Promise.resolve(null)
  ]);
  const features = extractData(featuresRaw);
  const cards = extractData(cardsRaw);
  if (!features) {
    process.exit(0);
  }
  const featureList = Array.isArray(features) ? features : features?.data ?? [];
  const cardList = Array.isArray(cards) ? cards : cards?.data ?? [];
  writeCache("features", featureList);
  const contextBlock = buildProductContextBlock(featureList, cardList);
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: contextBlock
      }
    })
  );
} catch {
  process.exit(0);
}
