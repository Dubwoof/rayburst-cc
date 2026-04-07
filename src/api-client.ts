/**
 * HTTP client for the Rayburst MCP API.
 *
 * Uses the StreamableHTTP MCP transport — sends JSON-RPC 2.0 requests
 * with Bearer auth and parses SSE responses.
 */

export interface RayburstConfig {
  apiUrl: string;
  apiKey: string;
  agentId?: string;
}

export class RayburstApiClient {
  private config: RayburstConfig;
  private requestId = 0;

  constructor(config: RayburstConfig) {
    this.config = config;
  }

  async call(toolName: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const id = ++this.requestId;

    const body = {
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args,
      },
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${this.config.apiKey}`,
    };

    if (this.config.agentId) {
      headers["X-Agent-Id"] = this.config.agentId;
    }

    const response = await fetch(this.config.apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `Rayburst API error ${response.status}: ${text || response.statusText}`
      );
    }

    const contentType = response.headers.get("content-type") ?? "";

    // SSE response — parse data lines
    if (contentType.includes("text/event-stream")) {
      const text = await response.text();
      return this.parseSSE(text);
    }

    // JSON response
    const json = await response.json();
    if (json.error) {
      throw new Error(`MCP error: ${json.error.message ?? JSON.stringify(json.error)}`);
    }
    return json.result ?? json;
  }

  private parseSSE(text: string): unknown {
    const lines = text.split("\n");
    let lastData: string | null = null;

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        lastData = line.slice(6);
      }
    }

    if (!lastData) {
      throw new Error("No data in SSE response");
    }

    try {
      const parsed = JSON.parse(lastData);
      if (parsed.error) {
        throw new Error(
          `MCP error: ${parsed.error.message ?? JSON.stringify(parsed.error)}`
        );
      }
      return parsed.result ?? parsed;
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error(`Failed to parse SSE data: ${lastData}`);
      }
      throw e;
    }
  }

  /**
   * Simple health check — calls the MCP initialize handshake.
   */
  async ping(): Promise<boolean> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${this.config.apiKey}`,
      };
      if (this.config.agentId) {
        headers["X-Agent-Id"] = this.config.agentId;
      }

      const response = await fetch(this.config.apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: ++this.requestId,
          method: "initialize",
          params: {
            protocolVersion: "2025-03-26",
            capabilities: {},
            clientInfo: { name: "rayburst-cc", version: "2.0.0" },
          },
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Read API key from .claude/rb-config.md in the project directory.
 */
function readApiKeyFromConfig(): string | null {
  try {
    const { readFileSync, existsSync } = require("node:fs");
    const { resolve } = require("node:path");

    const projectDir =
      process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const configPath = resolve(projectDir, ".claude", "rb-config.md");

    if (!existsSync(configPath)) return null;

    const content = readFileSync(configPath, "utf-8");
    const match = content.match(/-\s*API Key:\s*(.+)/i);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

/**
 * Create a client from config file or environment variables.
 * Priority: env var > rb-config.md
 */
export function createClientFromEnv(): RayburstApiClient {
  const apiKey = process.env.RAYBURST_API_KEY || readApiKeyFromConfig();
  const apiUrl = process.env.RAYBURST_API_URL ?? "https://api.rayburst.app/api/v1/mcp";
  const agentId = process.env.RAYBURST_AGENT_ID;

  if (!apiKey) {
    throw new Error(
      "Rayburst API key not found. Run /rb:init to configure, or set RAYBURST_API_KEY."
    );
  }

  return new RayburstApiClient({ apiUrl, apiKey, agentId });
}
