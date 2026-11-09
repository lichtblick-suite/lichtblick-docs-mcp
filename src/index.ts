#!/usr/bin/env node
// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { ExtensionApi } from "./api/extension-api.js";
import { runCheck } from "./check.js";
import { loadConfig } from "./config.js";
import { createDocSource } from "./docs/source.js";
import { DocsStore } from "./docs/store.js";
import { createLogger, errorMessage, silentLogger } from "./logging.js";
import { createServer, SERVER_VERSION } from "./server.js";

const config = loadConfig();

if (process.argv[2] === "check") {
  process.exitCode = await runCheck(config);
} else {
  const logger = config.log ? createLogger() : silentLogger;
  try {
    const docs = new DocsStore(createDocSource(config.docsSource), config.siteUrl, logger);
    const server = createServer({
      docs,
      api: new ExtensionApi(),
      logger,
    });
    await server.connect(new StdioServerTransport());
    logger("ready", { version: SERVER_VERSION, docsSource: config.docsSource });
    docs.warmUp();
  } catch (error) {
    // Fatal errors are reported even when logging is disabled.
    createLogger()("error", { message: "failed to start lichtblick-docs-mcp", error: errorMessage(error) });
    process.exitCode = 1;
  }
}
