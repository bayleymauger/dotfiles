import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// mcp.json does not expand env vars in `url`, so the Glean server is registered
// here to keep the instance URL out of the repo. Set GLEAN_MCP_URL in ~/.zshenv.
export default function (pi: ExtensionAPI) {
  const url = process.env.GLEAN_MCP_URL;

  if (!url) return;

  pi.registerMcpServer("glean", {
    url,
    description:
      "Search internal company knowledge (docs, chat, tickets, people) via Glean",
  });
}
