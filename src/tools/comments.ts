import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RayburstApiClient } from "../api-client.js";

export function registerCommentTools(server: McpServer, client: RayburstApiClient) {
  server.tool(
    "rb_add_comment",
    "Add a comment to a card",
    {
      cardId: z.string().describe("Card UUID"),
      content: z.string().min(1).max(5000).describe("Comment text (markdown)"),
    },
    async (args) => {
      const result = await client.call("add_comment", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );
}
