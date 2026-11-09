// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { createRequire } from "node:module";
import { z } from "zod";

import type { ExtensionApi } from "./api/extension-api.js";
import type { DocsStore } from "./docs/store.js";
import { errorMessage, silentLogger, type Logger } from "./logging.js";

export const { version: SERVER_VERSION } = createRequire(import.meta.url)(
  "../package.json",
) as { version: string };

export const INSTRUCTIONS = `Authoritative, up-to-date reference for Lichtblick (an open-source visualization and diagnosis tool for robotics data, forked from Foxglove Studio) and for its extension API, the npm package @lichtblick/suite.

When to use these tools:
- For ANY question about Lichtblick: panels (3D, Image, Plot, Raw Messages, Map, ...), data sources (ROS 1/2, MCAP, rosbridge, Foxglove WebSocket, remote files), layouts, settings, extensions, custom panels, message converters, topic aliases or camera models.
- Call docs_search or extension_api_get BEFORE using web search or answering from memory. Your training data may be outdated, and Foxglove Studio documentation and APIs differ from Lichtblick's.
- Only fall back to web search if these tools return nothing relevant, and say so.

How to use them:
1. docs_search with a few keywords, then docs_fetch the most relevant page path to read it in full.
2. When writing or reviewing extension or panel code, call extension_api_get for every @lichtblick/suite type you use (e.g. PanelExtensionContext, RenderState, ExtensionContext, SettingsTreeNode) and use the exact signatures it returns. Use extension_api_list if you do not know the symbol name.
3. docs_list shows every available page when searching is not enough.

Always cite the documentation URL returned by the tools in your answer.`;

export type ServerDependencies = {
  docs: DocsStore;
  api: ExtensionApi;
  logger?: Logger;
};

export function createServer({
  docs,
  api,
  logger = silentLogger,
}: ServerDependencies): McpServer {
  const server = new McpServer(
    { name: "lichtblick-docs", version: SERVER_VERSION },
    { instructions: INSTRUCTIONS },
  );

  const logged =
    <Args extends Record<string, unknown>>(
      tool: string,
      handler: (args: Args) => Promise<CallToolResult>,
    ) =>
    async (args: Args): Promise<CallToolResult> => {
      const start = performance.now();
      const log = (fields: Record<string, unknown>) => {
        logger("tool_call", {
          tool,
          args,
          durationMs: Math.round(performance.now() - start),
          ...fields,
        });
      };
      try {
        const result = await handler(args);
        log({ isError: result.isError === true });
        return result;
      } catch (error) {
        log({ isError: true, error: errorMessage(error) });
        throw error;
      }
    };

  server.registerTool(
    "docs_list",
    {
      title: "List Lichtblick documentation pages",
      description:
        "Lists every page of the official Lichtblick documentation and guides with its path and summary. Use it to discover what is documented when docs_search is not enough; then read a page with docs_fetch.",
      inputSchema: {
        section: z
          .string()
          .optional()
          .describe(
            'Only list pages of this section: "Documentation" or "Guides".',
          ),
      },
      annotations: { readOnlyHint: true },
    },
    logged("docs_list", async ({ section }) => {
      const pages = await docs.list(section);
      if (pages.length === 0) {
        return errorText(
          section ? `No pages in section "${section}".` : "No pages found.",
        );
      }
      return text(
        pages
          .map((page) =>
            [
              `- ${page.title} [${page.section}] path: ${page.path}`,
              page.description,
            ]
              .filter(Boolean)
              .join(" — "),
          )
          .join("\n"),
      );
    }),
  );

  server.registerTool(
    "docs_search",
    {
      title: "Search Lichtblick documentation",
      description:
        "Full-text search over the official Lichtblick documentation and guides (panels, data sources, layouts, settings, extensions, custom panels, message converters). Use this BEFORE web search for any Lichtblick question. Returns matching sections with page path, URL and snippet; read the full page with docs_fetch.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe(
            "A few keywords, e.g. 'subscribe topics custom panel', 'mcap remote file', '3d panel transforms'.",
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(20)
          .default(8)
          .describe("Maximum number of sections to return."),
      },
      annotations: { readOnlyHint: true },
    },
    logged("docs_search", async ({ query, limit }) => {
      const hits = await docs.search(query, limit);
      if (hits.length === 0) {
        return text(
          `No results for "${query}". Try other or fewer keywords, or docs_list to browse all pages.`,
        );
      }
      return text(
        hits
          .map((hit, i) => {
            const title = [hit.title, hit.heading].filter(Boolean).join(" › ");
            return `${i + 1}. ${title}\n   path: ${hit.path}\n   url: ${hit.url}\n   ${hit.snippet}`;
          })
          .join("\n\n"),
      );
    }),
  );

  server.registerTool(
    "docs_fetch",
    {
      title: "Fetch a Lichtblick documentation page",
      description:
        "Returns the full markdown of an official Lichtblick documentation page, by path (as returned by docs_search or docs_list) or by URL. Prefer this over fetching the website.",
      inputSchema: {
        path: z
          .string()
          .min(1)
          .describe(
            "Page path or URL, e.g. 'docs/extensions/extension-api/panel-extension-context'.",
          ),
      },
      annotations: { readOnlyHint: true },
    },
    logged("docs_fetch", async ({ path }) => {
      const page = await docs.fetch(path);
      if (!page) {
        return errorText(
          `Unknown page "${path}". Use docs_search or docs_list to find valid paths.`,
        );
      }
      return text(`Source: ${page.url}\n\n${page.markdown}`);
    }),
  );

  server.registerTool(
    "extension_api_list",
    {
      title: "List @lichtblick/suite API symbols",
      description:
        "Lists every type, interface and constant exported by @lichtblick/suite, the Lichtblick extension API. Use it to find the right symbol name, then call extension_api_get.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    logged("extension_api_list", async () => {
      const { version: suiteVersion, symbols } = await api.load();
      const lines = [...symbols.values()].map(
        (symbol) => `- ${symbol.name} (${symbol.kind})`,
      );
      return text(
        `@lichtblick/suite@${suiteVersion} exports ${symbols.size} symbols:\n${lines.join("\n")}`,
      );
    }),
  );

  server.registerTool(
    "extension_api_get",
    {
      title: "Get a @lichtblick/suite API symbol",
      description:
        "Returns the exact TypeScript declaration and doc comments of a symbol exported by @lichtblick/suite, e.g. PanelExtensionContext, ExtensionContext, RenderState, SettingsTreeNode, MessageEvent. Always use it instead of memory when writing Lichtblick extension or panel code: the API differs from Foxglove Studio's.",
      inputSchema: {
        symbol: z
          .string()
          .min(1)
          .describe("Exported symbol name (case-insensitive)."),
      },
      annotations: { readOnlyHint: true },
    },
    logged("extension_api_get", async ({ symbol }) => {
      const { version: suiteVersion } = await api.load();
      const found = await api.get(symbol);
      if (!found) {
        const suggestions = await api.suggest(symbol);
        const hint =
          suggestions.length > 0
            ? `Did you mean: ${suggestions.join(", ")}?`
            : "Use extension_api_list to see all symbols.";
        return errorText(
          `No symbol "${symbol}" is exported by @lichtblick/suite@${suiteVersion}. ${hint}`,
        );
      }
      return text(
        `${found.name} (${found.kind}) from @lichtblick/suite@${suiteVersion}, src/${found.file}\n\n\`\`\`ts\n${found.source}\n\`\`\``,
      );
    }),
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
      return {
        contents: [
          { uri: uri.href, mimeType: "text/markdown", text: page.markdown },
        ],
      };
    },
  );

  return server;
}

function text(value: string): CallToolResult {
  return { content: [{ type: "text", text: value }] };
}

function errorText(value: string): CallToolResult {
  return { ...text(value), isError: true };
}
