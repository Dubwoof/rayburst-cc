import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RayburstApiClient } from "../api-client.js";

const featureStatusEnum = z.enum(["draft", "active", "completed", "archived"]);

export function registerFeatureTools(server: McpServer, client: RayburstApiClient) {
  server.tool(
    "rb_list_features",
    "List features with optional filters",
    {
      projectId: z.string().optional().describe("Filter by project ID"),
      status: featureStatusEnum.optional().describe("Filter by status"),
      search: z.string().optional().describe("Search by title/description"),
      tagIds: z.array(z.string()).optional().describe("Filter by tag IDs"),
      limit: z.number().min(1).max(100).default(50).describe("Max results"),
      offset: z.number().min(0).default(0).describe("Pagination offset"),
    },
    async (args) => {
      const result = await client.call("list_features", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "rb_get_feature",
    "Get a feature by ID with its acceptance criteria",
    {
      featureId: z.string().describe("Feature UUID"),
    },
    async (args) => {
      const result = await client.call("get_feature", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "rb_create_feature",
    "Create a new feature with title and acceptance criteria",
    {
      title: z.string().min(1).max(200).describe("Feature title (noun phrase)"),
      description: z.string().optional().describe("Feature description"),
      projectIds: z.array(z.string()).describe("Project IDs to link"),
      status: featureStatusEnum.default("draft").describe("Initial status"),
    },
    async (args) => {
      const result = await client.call("create_feature", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "rb_update_feature",
    "Update an existing feature",
    {
      featureId: z.string().describe("Feature UUID"),
      title: z.string().min(1).max(200).optional().describe("New title"),
      description: z.string().optional().describe("New description"),
      status: featureStatusEnum.optional().describe("New status"),
      projectIds: z.array(z.string()).optional().describe("Updated project IDs"),
      tagIds: z.array(z.string()).optional().describe("Updated tag IDs"),
    },
    async (args) => {
      const result = await client.call("update_feature", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "rb_delete_feature",
    "Delete a feature permanently",
    {
      featureId: z.string().describe("Feature UUID"),
    },
    async (args) => {
      const result = await client.call("delete_feature", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );
}
