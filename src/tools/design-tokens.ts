import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RayburstApiClient } from "../api-client.js";

export function registerDesignTokenTools(server: McpServer, client: RayburstApiClient) {
  server.tool(
    "rb_list_design_tokens",
    "List all centralized design tokens for the organization. Optionally filter by category or search by name.",
    {
      category: z
        .enum(["color", "spacing", "typography", "border", "shadow", "opacity", "other"])
        .optional()
        .describe("Filter by token category"),
      search: z.string().optional().describe("Search tokens by name (partial match)"),
    },
    async (args) => {
      const result = await client.call("list_design_tokens", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "rb_get_design_token",
    "Get a single design token by ID, including its usage count across designs.",
    {
      tokenId: z.string().describe("UUID of the design token"),
    },
    async (args) => {
      const result = await client.call("get_design_token", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "rb_create_design_token",
    "Create a new centralized design token. Tokens are org-scoped and reusable across all feature designs. Use dot-notation for names (e.g. 'color.primary', 'spacing.md', 'typography.heading.lg').",
    {
      name: z.string().describe("Token name in dot-notation (e.g. 'color.primary', 'spacing.md')"),
      category: z
        .enum(["color", "spacing", "typography", "border", "shadow", "opacity", "other"])
        .describe("Token category"),
      value: z.string().describe("Resolved CSS value (e.g. '#3b82f6', '16px', '600')"),
      description: z.string().optional().describe("Optional human-readable description"),
    },
    async (args) => {
      const result = await client.call("create_design_token", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "rb_update_design_token",
    "Update an existing design token's name, value, category, or description.",
    {
      tokenId: z.string().describe("UUID of the design token to update"),
      name: z.string().optional().describe("New token name"),
      category: z
        .enum(["color", "spacing", "typography", "border", "shadow", "opacity", "other"])
        .optional()
        .describe("New category"),
      value: z.string().optional().describe("New CSS value"),
      description: z.string().optional().nullable().describe("New description"),
    },
    async (args) => {
      const result = await client.call("update_design_token", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "rb_delete_design_token",
    "Delete a design token. This also removes all usage links to designs.",
    {
      tokenId: z.string().describe("UUID of the design token to delete"),
    },
    async (args) => {
      const result = await client.call("delete_design_token", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "rb_link_design_token",
    "Link a centralized design token to a specific design, optionally specifying which CSS property uses it.",
    {
      designId: z.string().describe("UUID of the design"),
      tokenId: z.string().describe("UUID of the design token to link"),
      cssProperty: z.string().optional().describe("CSS property that uses this token (e.g. 'background-color')"),
    },
    async (args) => {
      const result = await client.call("link_design_token", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );
}
