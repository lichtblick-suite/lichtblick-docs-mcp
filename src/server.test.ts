// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ExtensionApi } from "./api/extension-api.js";
import { DocsStore } from "./docs/store.js";
import { createLogger } from "./logging.js";
import { createServer } from "./server.js";
import { createFakeDocSource, SITE_URL } from "./testing/fake-docs.js";

describe("MCP server", () => {
  const client = new Client({ name: "test-client", version: "0.0.0" });
  const server = createServer({
    docs: new DocsStore(createFakeDocSource(), SITE_URL),
    api: new ExtensionApi(),
  });

  beforeAll(async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterAll(async () => {
    await client.close();
  });

  const call = async (name: string, args: Record<string, unknown> = {}) =>
    (await client.callTool({ name, arguments: args })) as CallToolResult;
  const textOf = (result: CallToolResult) =>
    result.content
      .map((item) => (item.type === "text" ? item.text : ""))
      .join("");

  it("exposes the documentation and extension API tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      "docs_fetch",
      "docs_list",
      "docs_search",
      "extension_api_get",
      "extension_api_list",
    ]);
  });

  it("searches and then fetches a page", async () => {
    const search = await call("docs_search", { query: "registerPanel" });
    expect(textOf(search)).toContain("path: guides/create-custom-panel");

    const page = await call("docs_fetch", {
      path: "guides/create-custom-panel",
    });
    expect(textOf(page)).toContain(
      "Source: https://lichtblick-suite.github.io/docs/guides/create-custom-panel",
    );
  });

  it("returns a tool error for unknown pages and symbols", async () => {
    expect((await call("docs_fetch", { path: "nope" })).isError).toBe(true);

    const missing = await call("extension_api_get", {
      symbol: "SettingsTreeFieldNumbr",
    });
    expect(missing.isError).toBe(true);
  });

  it("returns the declaration of an API symbol", async () => {
    const result = await call("extension_api_get", {
      symbol: "ExtensionContext",
    });
    expect(textOf(result)).toContain("export interface ExtensionContext");
  });

  it("serves pages as resources", async () => {
    const { resources } = await client.listResources();
    expect(resources.map((resource) => resource.uri)).toContain(
      "lichtblick-docs://guides/create-custom-panel",
    );

    const { contents } = await client.readResource({
      uri: "lichtblick-docs://guides/create-custom-panel",
    });
    expect(contents[0]).toMatchObject({ mimeType: "text/markdown" });
  });

  it("lists pages, filtered by section", async () => {
    expect(textOf(await call("docs_list"))).toContain(
      "path: docs/connecting-to-data/frameworks/rosbridge",
    );

    const guides = textOf(await call("docs_list", { section: "Guides" }));
    expect(guides).toContain("path: guides/create-custom-panel");
    expect(guides).not.toContain("rosbridge");
  });

  it("reports an empty section as a tool error", async () => {
    const result = await call("docs_list", { section: "Nope" });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('No pages in section "Nope"');
  });

  it("suggests docs_list when a search has no results", async () => {
    expect(textOf(await call("docs_search", { query: "zzzqqqxx" }))).toContain(
      "No results",
    );
  });

  it("lists the exported API symbols", async () => {
    expect(textOf(await call("extension_api_list"))).toMatch(
      /^@lichtblick\/suite@\d+\.\d+\.\d+ exports \d+ symbols:/,
    );
  });

  it("suggests close symbol names", async () => {
    expect(
      textOf(await call("extension_api_get", { symbol: "SettingsTreeFiel" })),
    ).toContain("Did you mean:");
  });

  it("rejects unknown resources", async () => {
    await expect(
      client.readResource({ uri: "lichtblick-docs://nope" }),
    ).rejects.toThrow();
  });
});

describe("MCP server logging", () => {
  const lines: string[] = [];
  const logger = createLogger((line) => lines.push(line));
  const client = new Client({ name: "test-client", version: "0.0.0" });
  const server = createServer({
    // llms.txt is missing, so every docs tool call throws.
    docs: new DocsStore(createFakeDocSource({}), SITE_URL),
    api: new ExtensionApi(),
    logger,
  });
  const entries = () =>
    lines.map((line) => JSON.parse(line) as Record<string, unknown>);

  beforeAll(async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterAll(async () => {
    await client.close();
  });

  it("logs successful tool calls with arguments and duration", async () => {
    // When
    await client.callTool({
      name: "extension_api_get",
      arguments: { symbol: "RenderState" },
    });

    // Then
    expect(entries().at(-1)).toMatchObject({
      event: "tool_call",
      tool: "extension_api_get",
      args: { symbol: "RenderState" },
      isError: false,
      durationMs: expect.any(Number) as number,
    });
  });

  it("logs failing tool calls with the error", async () => {
    // When
    const result = (await client.callTool({
      name: "docs_search",
      arguments: { query: "panel" },
    })) as CallToolResult;

    // Then
    expect(result.isError).toBe(true);
    expect(entries().at(-1)).toMatchObject({
      event: "tool_call",
      tool: "docs_search",
      args: { query: "panel", limit: 8 },
      isError: true,
      error: "Not found: llms.txt",
    });
  });
});
