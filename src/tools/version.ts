import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const CURRENT_VERSION = "3.2.0";
const NPM_PACKAGE = "@rayburst/cc";

export function registerVersionTools(server: McpServer) {
  server.tool(
    "rb_version",
    "Check current plugin version and whether a newer version is available",
    {},
    async () => {
      let latestVersion: string | null = null;
      let updateAvailable = false;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(
          `https://registry.npmjs.org/${NPM_PACKAGE}/latest`,
          { signal: controller.signal }
        );
        clearTimeout(timeout);

        if (res.ok) {
          const data = (await res.json()) as { version?: string };
          latestVersion = data.version ?? null;
          if (latestVersion && latestVersion !== CURRENT_VERSION) {
            updateAvailable = true;
          }
        }
      } catch {
        // npm registry unreachable — still report current version
      }

      const result: Record<string, unknown> = {
        currentVersion: CURRENT_VERSION,
        latestVersion: latestVersion ?? "unknown (could not reach npm registry)",
        updateAvailable,
      };

      if (updateAvailable) {
        result.updateCommand = "claude plugin update rayburst";
        result.message = `Update available: ${CURRENT_VERSION} → ${latestVersion}. Run: claude plugin update rayburst`;
      } else if (latestVersion && !updateAvailable) {
        result.message = `You are on the latest version (${CURRENT_VERSION}).`;
      }

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    }
  );
}
