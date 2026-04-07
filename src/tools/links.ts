import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RayburstApiClient } from "../api-client.js";

export function registerLinkTools(server: McpServer, client: RayburstApiClient) {
  server.tool(
    "rb_link_feature_to_feature",
    "Create a typed link between two features",
    {
      sourceFeatureId: z.string().describe("Source feature UUID"),
      targetFeatureId: z.string().describe("Target feature UUID"),
      linkType: z
        .enum(["depends_on", "implements", "extends", "related_to"])
        .optional()
        .describe("Relationship type"),
    },
    async (args) => {
      const result = await client.call("link_feature_to_feature", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "rb_list_feature_links",
    "List all feature-to-feature links for a feature",
    {
      featureId: z.string().describe("Feature UUID"),
    },
    async (args) => {
      const result = await client.call("list_feature_links", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );
}
