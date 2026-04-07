import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RayburstApiClient } from "../api-client.js";

const validationResultSchema = z.object({
  criterionId: z.string().describe("Criterion UUID"),
  status: z.enum(["pass", "fail", "blocked", "skipped"]).describe("Result status"),
  notes: z.string().optional().describe("Validation notes"),
});

export function registerValidationTools(server: McpServer, client: RayburstApiClient) {
  server.tool(
    "rb_submit_validation",
    "Submit a validation report for a card or feature",
    {
      cardId: z.string().optional().describe("Card UUID (provide cardId OR featureId)"),
      featureId: z
        .string()
        .optional()
        .describe("Feature UUID (provide cardId OR featureId)"),
      results: z
        .array(validationResultSchema)
        .min(1)
        .describe("Per-criterion validation results"),
      overallComment: z.string().optional().describe("Summary comment"),
    },
    async (args) => {
      const result = await client.call("submit_validation", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );
}
