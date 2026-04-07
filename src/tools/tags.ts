import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RayburstApiClient } from "../api-client.js";

const tagColorEnum = z.enum([
  "gray",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
]);

export function registerTagTools(server: McpServer, client: RayburstApiClient) {
  server.tool(
    "rb_list_tags",
    "List all tags in the organization",
    {},
    async () => {
      const result = await client.call("list_tags", {});
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "rb_create_tag",
    "Create a new tag",
    {
      name: z.string().min(1).max(50).describe("Tag name"),
      color: tagColorEnum.describe("Tag color"),
    },
    async (args) => {
      const result = await client.call("create_tag", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );
}
