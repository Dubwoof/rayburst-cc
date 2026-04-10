import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RayburstApiClient } from "../api-client.js";

export function registerDesignTools(server: McpServer, client: RayburstApiClient) {
  server.tool(
    "rb_list_designs",
    "List all designs for a feature. Returns design metadata without full image data.",
    {
      featureId: z.string().describe("UUID of the feature"),
    },
    async (args) => {
      const result = await client.call("list_designs", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "rb_get_design",
    "Get full design details including design tokens, CSS properties, component tree, and image data.",
    {
      featureId: z.string().describe("UUID of the feature"),
      designId: z.string().describe("UUID of the design"),
    },
    async (args) => {
      const result = await client.call("get_design", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "rb_create_design",
    "Create a design from Figma browser MCP output. Stores design tokens, CSS properties, component tree, and screenshot image.",
    {
      featureId: z.string().describe("UUID of the feature this design belongs to"),
      name: z.string().min(1).max(255).describe("Design name"),
      source: z.enum(["figma", "code-analysis"]).optional().describe("Design source (defaults to figma)"),
      designTokens: z.record(z.string(), z.unknown()).optional().describe("Design tokens from Figma"),
      cssProperties: z.record(z.string(), z.unknown()).optional().describe("CSS properties extracted from Figma"),
      componentTree: z.record(z.string(), z.unknown()).optional().describe("Component tree structure from Figma"),
      imageData: z.string().max(682_667).optional().nullable().describe("Base64-encoded image data (max ~500KB)"),
      toonContent: z.string().optional().nullable().describe(
        "TOON-formatted string (Token-Oriented Object Notation) describing the component structure, design tokens, and CSS properties. Used for live sandbox rendering. In the componentTree, the 'type' field on each node MUST be either a real HTML tag name (div, span, button, img, etc.) or a PascalCase React component name. Do NOT use Figma node type names like 'frame', 'text', 'group', 'instance', 'rectangle'."
      ),
    },
    async (args) => {
      const result = await client.call("create_design", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "rb_update_design",
    "Update design fields. All fields except featureId and designId are optional.",
    {
      featureId: z.string().describe("UUID of the feature"),
      designId: z.string().describe("UUID of the design"),
      name: z.string().min(1).max(255).optional().describe("New design name"),
      source: z.enum(["figma", "code-analysis"]).optional().describe("New design source"),
      designTokens: z.record(z.string(), z.unknown()).optional().describe("Updated design tokens"),
      cssProperties: z.record(z.string(), z.unknown()).optional().describe("Updated CSS properties"),
      componentTree: z.record(z.string(), z.unknown()).optional().describe("Updated component tree"),
      imageData: z.string().max(682_667).optional().nullable().describe("Updated base64-encoded image data (max ~500KB)"),
      toonContent: z.string().optional().nullable().describe(
        "TOON-formatted string. In the componentTree, the 'type' field MUST be a real HTML tag or PascalCase React component name — not Figma node types."
      ),
      status: z.enum(["draft", "active", "archived"]).optional().describe("New design status"),
    },
    async (args) => {
      const result = await client.call("update_design", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "rb_delete_design",
    "Delete a design permanently.",
    {
      featureId: z.string().describe("UUID of the feature"),
      designId: z.string().describe("UUID of the design to delete"),
    },
    async (args) => {
      const result = await client.call("delete_design", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );
}
