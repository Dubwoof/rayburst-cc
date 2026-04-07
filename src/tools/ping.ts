import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RayburstApiClient } from "../api-client.js";

export function registerPingTools(server: McpServer, client: RayburstApiClient) {
  server.tool(
    "rb_ping",
    "Check connection to the Rayburst API",
    {},
    async () => {
      const ok = await client.ping();
      return {
        content: [
          {
            type: "text" as const,
            text: ok
              ? JSON.stringify({ status: "ok", message: "Connected to Rayburst API" })
              : JSON.stringify({ status: "error", message: "Failed to connect to Rayburst API" }),
          },
        ],
      };
    }
  );
}
