#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { ExtensionApi } from "./api/extension-api.js";
import { loadConfig } from "./config.js";
import { createDocSource } from "./docs/source.js";
import { DocsStore } from "./docs/store.js";
import { createServer } from "./server.js";

const config = loadConfig();
const server = createServer({
  docs: new DocsStore(createDocSource(config.docsSource), config.siteUrl),
  api: new ExtensionApi(),
});

await server.connect(new StdioServerTransport());
// stdout carries the MCP protocol, so diagnostics go to stderr.
console.error(`lichtblick-docs-mcp ready (docs source: ${config.docsSource})`);
