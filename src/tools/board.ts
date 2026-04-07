import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RayburstApiClient } from "../api-client.js";

const cardStatusEnum = z.enum([
  "draft",
  "ready",
  "in-progress",
  "validation",
  "done",
]);

export function registerBoardTools(server: McpServer, client: RayburstApiClient) {
  server.tool(
    "rb_list_boards",
    "List all boards in the organization",
    {},
    async () => {
      const result = await client.call("list_boards", {});
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "rb_list_cards",
    "List all cards on a board",
    {
      boardId: z.string().describe("Board UUID"),
    },
    async (args) => {
      const result = await client.call("list_cards", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "rb_get_card",
    "Get a card with its roles, todos, and dependencies",
    {
      cardId: z.string().describe("Card UUID"),
    },
    async (args) => {
      const result = await client.call("get_card", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "rb_create_card",
    "Create a new card on a board",
    {
      boardId: z.string().describe("Board UUID"),
      columnId: z.string().optional().describe("Column UUID"),
      title: z.string().min(1).max(200).describe("Card title"),
      description: z.string().max(2000).optional().describe("Card description"),
      status: cardStatusEnum.default("draft").describe("Initial status"),
    },
    async (args) => {
      const result = await client.call("create_card", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "rb_update_card",
    "Update a card's title or description",
    {
      cardId: z.string().describe("Card UUID"),
      title: z.string().min(1).max(200).optional().describe("New title"),
      description: z.string().max(2000).optional().describe("New description"),
    },
    async (args) => {
      const result = await client.call("update_card", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "rb_move_card",
    "Move a card to a new status column",
    {
      cardId: z.string().describe("Card UUID"),
      status: cardStatusEnum.describe("Target status"),
      afterCardId: z
        .string()
        .nullable()
        .optional()
        .describe("Card to place after (null for top)"),
    },
    async (args) => {
      const result = await client.call("move_card", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "rb_list_card_features",
    "List features linked to a card",
    {
      cardId: z.string().describe("Card UUID"),
    },
    async (args) => {
      const result = await client.call("list_card_features", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "rb_list_card_todos",
    "List implementation todos on a card",
    {
      cardId: z.string().describe("Card UUID"),
    },
    async (args) => {
      const result = await client.call("list_card_todos", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "rb_list_card_roles",
    "List role assignments on a card",
    {
      cardId: z.string().describe("Card UUID"),
    },
    async (args) => {
      const result = await client.call("list_card_roles", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }
  );
}
