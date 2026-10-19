import { createRequire } from "node:module";

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import type { ExtensionApi } from "./api/extension-api.js";
import type { DocsStore } from "./docs/store.js";

const { version } = createRequire(import.meta.url)("../package.json") as { version: string };

const INSTRUCTIONS = `Reference material for Lichtblick, a visualization and diagnosis tool for robotics data, and for its extension API (@lichtblick/suite).
- Use docs_search to find relevant sections, then docs_fetch to read the full page.
- Use extension_api_get for exact TypeScript signatures; prefer it over memory when writing extension or panel code.
- Cite the page URL when answering from the documentation.`;

export type ServerDependencies = {
  docs: DocsStore;
  api: ExtensionApi;
};

export function createServer({ docs, api }: ServerDependencies): McpServer {
  const server = new McpServer({ name: "lichtblick-docs", version }, { instructions: INSTRUCTIONS });

  server.registerTool(
    "docs_list",
    {
      title: "List Lichtblick documentation pages",
      description: "Lists the pages of the Lichtblick documentation with their path and summary.",
      inputSchema: {
        section: z.string().optional().describe('Only list pages of this section, e.g. "Documentation" or "Guides".'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ section }) => {
      const pages = await docs.list(section);
      if (pages.length === 0) {
        return text(section ? `No pages in section "${section}".` : "No pages found.", true);
      }
      return text(
        pages
          .map((page) => [`- ${page.title} [${page.section}] path: ${page.path}`, page.description].filter(Boolean).join(" — "))
          .join("\n"),
      );
    },
  );

  server.registerTool(
    "docs_search",
    {
      title: "Search Lichtblick documentation",
      description:
        "Full-text search over the Lichtblick documentation and guides. Returns matching sections with their page path, URL and a snippet.",
      inputSchema: {
        query: z.string().min(1).describe("Keywords, e.g. 'subscribe topics custom panel'."),
        limit: z.number().int().min(1).max(20).default(8),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ query, limit }) => {
      const hits = await docs.search(query, limit);
      if (hits.length === 0) {
        return text(`No results for "${query}". Try other keywords or docs_list.`);
      }
      return text(
        hits
          .map((hit, i) => {
            const title = [hit.title, hit.heading].filter(Boolean).join(" › ");
            return `${i + 1}. ${title}\n   path: ${hit.path}\n   url: ${hit.url}\n   ${hit.snippet}`;
          })
          .join("\n\n"),
      );
    },
  );

  server.registerTool(
    "docs_fetch",
    {
      title: "Fetch a Lichtblick documentation page",
      description: "Returns the full markdown of a documentation page, by path (from docs_search/docs_list) or URL.",
      inputSchema: {
        path: z.string().min(1).describe("e.g. 'docs/extensions/extension-api/panel-extension-context'"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ path }) => {
      const page = await docs.fetch(path);
      if (!page) {
        return text(`Unknown page "${path}". Use docs_search or docs_list to find valid paths.`, true);
      }
      return text(`Source: ${page.url}\n\n${page.markdown}`);
    },
  );

  server.registerTool(
    "extension_api_list",
    {
      title: "List @lichtblick/suite API symbols",
      description: "Lists every type, interface and constant exported by @lichtblick/suite, the Lichtblick extension API.",
      annotations: { readOnlyHint: true },
    },
    async () => {
      const { version: suiteVersion, symbols } = await api.load();
      const lines = [...symbols.values()].map((symbol) => `- ${symbol.name} (${symbol.kind})`);
      return text(`@lichtblick/suite@${suiteVersion} exports ${symbols.size} symbols:\n${lines.join("\n")}`);
    },
  );

  server.registerTool(
    "extension_api_get",
    {
      title: "Get a @lichtblick/suite API symbol",
      description:
        "Returns the TypeScript declaration and doc comments of a symbol exported by @lichtblick/suite, e.g. PanelExtensionContext, ExtensionContext, RenderState, SettingsTreeNode.",
      inputSchema: {
        symbol: z.string().min(1).describe("Exported symbol name (case-insensitive)."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ symbol }) => {
      const { version: suiteVersion } = await api.load();
      const found = await api.get(symbol);
      if (!found) {
        const suggestions = await api.suggest(symbol);
        const hint = suggestions.length > 0 ? `Did you mean: ${suggestions.join(", ")}?` : "Use extension_api_list to see all symbols.";
        return text(`No symbol "${symbol}" is exported by @lichtblick/suite@${suiteVersion}. ${hint}`, true);
      }
      return text(
        `${found.name} (${found.kind}) from @lichtblick/suite@${suiteVersion}, src/${found.file}\n\n\`\`\`ts\n${found.source}\n\`\`\``,
      );
    },
  );

  server.registerResource(
    "doc-page",
    new ResourceTemplate("lichtblick-docs://{+path}", {
      list: async () => ({
        resources: (await docs.list()).map((page) => ({
          uri: `lichtblick-docs://${page.path}`,
          name: page.title,
          description: page.description,
          mimeType: "text/markdown",
        })),
      }),
    }),
    { title: "Lichtblick documentation page", mimeType: "text/markdown" },
    async (uri, { path }) => {
      const pagePath = Array.isArray(path) ? path.join("/") : String(path);
      const page = await docs.fetch(pagePath);
      if (!page) {
        throw new Error(`Unknown documentation page: ${pagePath}`);
      }
      return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: page.markdown }] };
    },
  );

  return server;
}

function text(value: string, isError = false): CallToolResult {
  const content: CallToolResult["content"] = [{ type: "text", text: value }];
  return isError ? { content, isError } : { content };
}
