import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClientFromEnv } from "./api-client.js";
import { registerPingTools } from "./tools/ping.js";
import { registerFeatureTools } from "./tools/features.js";
import { registerCriterionTools } from "./tools/criteria.js";
import { registerBoardTools } from "./tools/board.js";
import { registerLinkTools } from "./tools/links.js";
import { registerValidationTools } from "./tools/validation.js";
import { registerTagTools } from "./tools/tags.js";
import { registerCommentTools } from "./tools/comments.js";

const server = new McpServer({
  name: "rayburst",
  version: "2.0.0",
});

let client: ReturnType<typeof createClientFromEnv> | null = null;

function getClient() {
  if (!client) {
    client = createClientFromEnv();
  }
  return client;
}

// Register all tools with lazy client initialization.
// The client is created on first tool call, not at startup,
// so the server can start even if RAYBURST_API_KEY is not yet set.
const lazyClient = new Proxy({} as ReturnType<typeof createClientFromEnv>, {
  get(_target, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

registerPingTools(server, lazyClient);
registerFeatureTools(server, lazyClient);
registerCriterionTools(server, lazyClient);
registerBoardTools(server, lazyClient);
registerLinkTools(server, lazyClient);
registerValidationTools(server, lazyClient);
registerTagTools(server, lazyClient);
registerCommentTools(server, lazyClient);

// Graceful shutdown
const cleanup = async () => {
  try {
    await server.close();
  } catch {
    // ignore
  }
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

// Start stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
