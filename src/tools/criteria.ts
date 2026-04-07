import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RayburstApiClient } from "../api-client.js";

const criterionStatusEnum = z.enum([
  "draft",
  "pending",
  "pass",
  "fail",
  "blocked",
  "skipped",
  "deprecated",
]);

const validationMethodEnum = z.enum(["manual", "browser", "code-review"]);

export function registerCriterionTools(server: McpServer, client: RayburstApiClient) {
  server.tool(
    "rb_add_criterion",
    "Add an acceptance criterion to a feature",
    {
      featureId: z.string().describe("Feature UUID"),
      title: z.string().max(200).optional().describe("Short criterion title"),
      description: z
        .string()
        .min(1)
        .max(2000)
        .describe("Criterion description (Gherkin Given/When/Then preferred)"),
      status: criterionStatusEnum.default("pending").describe("Initial status"),
      validationMethod: validationMethodEnum
        .default("manual")
        .describe("How this criterion is validated"),
      allowCodeReviewFallback: z
        .boolean()
        .optional()
        .describe("Allow code review as fallback validation"),
      validationNotes: z
        .string()
        .max(5000)
        .optional()
        .describe("Notes for validators"),
      tagIds: z.array(z.string()).optional().describe("Tag IDs to assign"),
    },
    async (args) => {
      const result = await client.call("add_criterion", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "rb_update_criterion",
    "Update an existing acceptance criterion",
    {
      featureId: z.string().describe("Feature UUID"),
      criterionId: z.string().describe("Criterion UUID"),
      title: z.string().max(200).nullable().optional().describe("New title"),
      description: z.string().min(1).max(2000).optional().describe("New description"),
      status: criterionStatusEnum.optional().describe("New status"),
      validationMethod: validationMethodEnum.optional().describe("New validation method"),
      allowCodeReviewFallback: z.boolean().optional(),
      validationNotes: z.string().max(5000).nullable().optional(),
      tagIds: z.array(z.string()).optional(),
    },
    async (args) => {
      const result = await client.call("update_criterion", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "rb_delete_criterion",
    "Delete an acceptance criterion from a feature",
    {
      featureId: z.string().describe("Feature UUID"),
      criterionId: z.string().describe("Criterion UUID"),
    },
    async (args) => {
      const result = await client.call("delete_criterion", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );
}
