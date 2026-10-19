import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ExtensionApi } from "./api/extension-api.js";
import { DocsStore } from "./docs/store.js";
import { createServer } from "./server.js";
import { createFakeDocSource, SITE_URL } from "./testing/fake-docs.js";

describe("MCP server", () => {
  const client = new Client({ name: "test-client", version: "0.0.0" });
  const server = createServer({
    docs: new DocsStore(createFakeDocSource(), SITE_URL),
    api: new ExtensionApi(),
  });

  beforeAll(async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterAll(async () => {
    await client.close();
  });

  const call = async (name: string, args: Record<string, unknown> = {}) =>
    (await client.callTool({ name, arguments: args })) as CallToolResult;
  const textOf = (result: CallToolResult) => result.content.map((item) => (item.type === "text" ? item.text : "")).join("");

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

    const page = await call("docs_fetch", { path: "guides/create-custom-panel" });
    expect(textOf(page)).toContain("Source: https://lichtblick-suite.github.io/docs/guides/create-custom-panel");
  });

  it("returns a tool error for unknown pages and symbols", async () => {
    expect((await call("docs_fetch", { path: "nope" })).isError).toBe(true);

    const missing = await call("extension_api_get", { symbol: "SettingsTreeFieldNumbr" });
    expect(missing.isError).toBe(true);
  });

  it("returns the declaration of an API symbol", async () => {
    const result = await call("extension_api_get", { symbol: "ExtensionContext" });
    expect(textOf(result)).toContain("export interface ExtensionContext");
  });

  it("serves pages as resources", async () => {
    const { resources } = await client.listResources();
    expect(resources.map((resource) => resource.uri)).toContain("lichtblick-docs://guides/create-custom-panel");

    const { contents } = await client.readResource({ uri: "lichtblick-docs://guides/create-custom-panel" });
    expect(contents[0]).toMatchObject({ mimeType: "text/markdown" });
  });
});
