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
  const projectIds = [];
  const projectsSection = content.match(/## Projects[\s\S]*?(?=\n## |$)/);
  if (projectsSection) {
    const projectLines = projectsSection[0].split("\n").filter((l) => l.trim().startsWith("-"));
    for (const line of projectLines) {
      const match = line.match(/-\s*(?:.+?):\s*([a-f0-9-]{36})/i);
      if (match) projectIds.push(match[1]);
    }
  }
  if (projectIds.length === 0) {
    if (frontendProjectId) projectIds.push(frontendProjectId);
    if (backendProjectId) projectIds.push(backendProjectId);
  }
  if (!apiKey) return null;
  return {
    apiKey,
    apiUrl,
    agentId: agentId || void 0,
    boardId: boardId || void 0,
    boardSlug: boardSlug || void 0,
    frontendProjectId: frontendProjectId || projectIds[0] || void 0,
    backendProjectId: backendProjectId || projectIds[1] || void 0,
    projectIds,
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
var STOP_WORDS = /* @__PURE__ */ new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "can",
  "to",
  "of",
  "in",
  "for",
  "on",
  "with",
  "at",
  "by",
  "from",
  "as",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "between",
  "out",
  "off",
  "over",
  "under",
  "again",
  "further",
  "then",
  "once",
  "here",
  "there",
  "when",
  "where",
  "why",
  "how",
  "all",
  "each",
  "every",
  "both",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "nor",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "just",
  "about",
  "up",
  "and",
  "but",
  "or",
  "if",
  "it",
  "its",
  "this",
  "that",
  "these",
  "those",
  "i",
  "me",
  "my",
  "we",
  "our",
  "you",
  "your",
  "he",
  "him",
  "his",
  "she",
  "her",
  "they",
  "them",
  "their",
  "what",
  "which",
  "who",
  "whom",
  "help",
  "implement",
  "add",
  "create",
  "make",
  "build",
  "fix",
  "update",
  "change",
  "modify",
  "please",
  "need",
  "want",
  "let",
  "get"
]);
function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}
function matchFeatures(prompt2, features) {
  if (!prompt2 || !features || features.length === 0) return [];
  const promptTokens = tokenize(prompt2);
  if (promptTokens.length === 0) return [];
  const promptSet = new Set(promptTokens);
  const promptLower = prompt2.toLowerCase();
  const scored = [];
  for (const feature of features) {
    const titleTokens = tokenize(feature.title || "");
    const descTokens = tokenize(feature.description || "");
    const featureTokens = /* @__PURE__ */ new Set([...titleTokens, ...descTokens]);
    let overlap = 0;
    for (const token of promptSet) {
      if (featureTokens.has(token)) overlap++;
    }
    const titleLower = (feature.title || "").toLowerCase();
    let phraseBonus = 0;
    if (promptLower.includes(titleLower) || titleLower.includes(promptLower)) {
      phraseBonus = 0.5;
    }
    const titleCoverage = titleTokens.length > 0 ? titleTokens.filter((t) => promptSet.has(t)).length / titleTokens.length : 0;
    let titleBonus = 0;
    if (titleCoverage >= 1) titleBonus = 0.5;
    else if (titleCoverage >= 0.8) titleBonus = 0.3;
    const score = overlap / promptSet.size + phraseBonus + titleBonus;
    if (score >= 0.15) {
      scored.push({ feature, score });
    }
  }
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const statusOrder = { active: 0, draft: 1, completed: 2, archived: 3 };
    return (statusOrder[a.feature.status ?? ""] ?? 9) - (statusOrder[b.feature.status ?? ""] ?? 9);
  });
  return scored.slice(0, 3).map((s) => s.feature);
}

// src/hooks/product-context-block.ts
function buildActiveFeatureBlock(features) {
  if (!features || features.length === 0) return "";
  const featureBlocks = features.map((f) => {
    const criteria = (f.criteria || []).map((c) => {
      return `    <criterion id="${c.id}" status="${c.status}">${escapeXml(c.title || "")} \u2014 ${escapeXml(c.description || "")}</criterion>`;
    }).join("\n");
    return `  <feature id="${f.id}" title="${escapeXml(f.title)}" status="${f.status}">
    <description>${escapeXml(f.description || "")}</description>
${criteria}
  </feature>`;
  });
  return `<rayburst_active_feature>
${featureBlocks.join("\n")}
  <guidance>Work against these acceptance criteria. You will be required to update the Rayburst feature atlas immediately after writing code \u2014 a post-write reminder will enforce this. (1) call rb_update_criterion or rb_add_criterion to reflect what was built, (2) call rb_update_feature if the description needs updating, (3) summarize which criteria your changes address and which remain.</guidance>
</rayburst_active_feature>`;
}
function escapeXml(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// src/hooks/userpromptsubmit.ts
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
var prompt = hookInput?.input?.prompt;
if (!prompt || typeof prompt !== "string") {
  process.exit(0);
}
var config = readConfig();
if (!config || !config.apiKey) {
  process.exit(0);
}
var featureList = readCache("features");
if (!featureList || featureList.length === 0) {
  process.exit(0);
}
var matches = matchFeatures(prompt, featureList);
if (matches.length === 0) {
  writeCache("active-feature", null);
  process.exit(0);
}
try {
  const detailed = await Promise.all(
    matches.map(async (f) => {
      const raw = await mcpCall(config, "get_feature", { featureId: f.id });
      const data = extractData(raw);
      return data || f;
    })
  );
  writeCache("active-feature", detailed[0]);
  const contextBlock = buildActiveFeatureBlock(detailed);
  if (contextBlock) {
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: contextBlock
        }
      })
    );
  }
} catch {
  process.exit(0);
}
