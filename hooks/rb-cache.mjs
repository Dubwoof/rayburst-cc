/**
 * Shared utilities for Rayburst hooks.
 * Config parsing, API calls, file caching, and feature matching.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

// ── Project dir & hashing ──

export function getProjectDir() {
  return (
    process.env.CLAUDE_PROJECT_DIR ||
    process.env.CONTEXT_MODE_PROJECT_DIR ||
    process.cwd()
  );
}

export function getProjectHash() {
  return createHash("md5").update(getProjectDir()).digest("hex").slice(0, 12);
}

// ── Cache paths ──

export function getCachePath(type) {
  return `/tmp/rb-${type}-${getProjectHash()}.json`;
}

export function readCache(type) {
  try {
    const path = getCachePath(type);
    if (!existsSync(path)) return null;
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeCache(type, data) {
  try {
    const path = getCachePath(type);
    writeFileSync(path, JSON.stringify(data), "utf-8");
  } catch {
    /* best effort */
  }
}

// ── Config parsing ──

export function readConfig() {
  const projectDir = getProjectDir();
  const configPath = resolve(projectDir, ".claude", "rb-config.md");

  if (!existsSync(configPath)) return null;

  const content = readFileSync(configPath, "utf-8");

  function parseField(section, key) {
    const sectionMatch = content.match(
      new RegExp(`## ${section}[\\s\\S]*?(?=\\n## |$)`)
    );
    if (!sectionMatch) return null;
    const lineMatch = sectionMatch[0].match(
      new RegExp(`-\\s*${key}:\\s*(.+)`, "i")
    );
    if (lineMatch) return lineMatch[1].trim();
    // Fallback: section content on next line (for Project URL)
    const lines = sectionMatch[0]
      .split("\n")
      .filter((l) => l.trim() && !l.startsWith("#"));
    return lines[0]?.trim() || null;
  }

  // Read API key: env var takes priority, then config file
  const apiKey = process.env.RAYBURST_API_KEY || parseField("API", "API Key");
  const apiUrl =
    process.env.RAYBURST_API_URL ||
    parseField("API", "API URL") ||
    "https://api.rayburst.app/api/v1/mcp";
  const agentId = process.env.RAYBURST_AGENT_ID;
  const boardId = parseField("Board", "ID");
  const boardSlug = parseField("Board", "Slug");
  const frontendProjectId = parseField("Projects", "Frontend");
  const backendProjectId = parseField("Projects", "Backend");
  const projectUrl = parseField("Project URL", null);

  return {
    apiKey,
    apiUrl,
    agentId,
    boardId,
    boardSlug,
    frontendProjectId,
    backendProjectId,
    projectUrl,
  };
}

// ── API calls ──

let requestId = 0;

export async function mcpCall(config, toolName, args = {}) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    Authorization: `Bearer ${config.apiKey}`,
  };
  if (config.agentId) headers["X-Agent-Id"] = config.agentId;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch(config.apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: ++requestId,
        method: "tools/call",
        params: { name: toolName, arguments: args },
      }),
      signal: controller.signal,
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

export function extractData(result) {
  if (!result) return null;
  if (result.content && Array.isArray(result.content)) {
    const textItem = result.content.find((c) => c.type === "text");
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

// ── Feature matching ──

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "to", "of", "in", "for",
  "on", "with", "at", "by", "from", "as", "into", "through", "during",
  "before", "after", "above", "below", "between", "out", "off", "over",
  "under", "again", "further", "then", "once", "here", "there", "when",
  "where", "why", "how", "all", "each", "every", "both", "few", "more",
  "most", "other", "some", "such", "no", "nor", "not", "only", "own",
  "same", "so", "than", "too", "very", "just", "about", "up", "and",
  "but", "or", "if", "it", "its", "this", "that", "these", "those",
  "i", "me", "my", "we", "our", "you", "your", "he", "him", "his",
  "she", "her", "they", "them", "their", "what", "which", "who", "whom",
  "help", "implement", "add", "create", "make", "build", "fix", "update",
  "change", "modify", "please", "need", "want", "let", "get",
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Match a user prompt against a list of features.
 * Returns matched features sorted by score, or empty array.
 */
export function matchFeatures(prompt, features) {
  if (!prompt || !features || features.length === 0) return [];

  const promptTokens = tokenize(prompt);
  if (promptTokens.length === 0) return [];

  const promptSet = new Set(promptTokens);
  const promptLower = prompt.toLowerCase();

  const scored = [];

  for (const feature of features) {
    const titleTokens = tokenize(feature.title || "");
    const descTokens = tokenize(feature.description || "");
    const featureTokens = new Set([...titleTokens, ...descTokens]);

    // Count overlapping tokens
    let overlap = 0;
    for (const token of promptSet) {
      if (featureTokens.has(token)) overlap++;
    }

    // Bonus: consecutive phrase match in title
    const titleLower = (feature.title || "").toLowerCase();
    let phraseBonus = 0;
    if (promptLower.includes(titleLower) || titleLower.includes(promptLower)) {
      phraseBonus = 0.5;
    }

    const score = overlap / promptSet.size + phraseBonus;

    if (score >= 0.25) {
      scored.push({ feature, score });
    }
  }

  // Sort by score desc, prefer active features on tie
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const statusOrder = { active: 0, draft: 1, completed: 2, archived: 3 };
    return (statusOrder[a.feature.status] ?? 9) - (statusOrder[b.feature.status] ?? 9);
  });

  return scored.slice(0, 3).map((s) => s.feature);
}
