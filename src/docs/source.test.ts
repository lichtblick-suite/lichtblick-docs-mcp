// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { loadConfig } from "../config.js";
import { createDocSource, withTrailingSlash } from "./source.js";

describe("createDocSource", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads files from a local build directory and rejects paths outside it", async () => {
    // Given
    const dir = await mkdtemp(join(tmpdir(), "docs-mcp-source-"));
    await writeFile(join(dir, "llms.txt"), "hello");
    const source = createDocSource(dir);

    try {
      // When / Then
      await expect(source.read("llms.txt")).resolves.toBe("hello");
      await expect(source.read("../outside.md")).rejects.toThrow(
        "escapes the docs source",
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("fetches pages over http relative to the base URL", async () => {
    // Given
    const fetchMock = vi.fn(async () => new Response("page"));
    vi.stubGlobal("fetch", fetchMock);
    const source = createDocSource("https://example.com/docs");

    // When
    const text = await source.read("guides/a.md");

    // Then
    expect(text).toBe("page");
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toBe(
      "https://example.com/docs/guides/a.md",
    );
  });

  it("reports http errors and rejects paths outside the base URL", async () => {
    // Given
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 404 })),
    );
    const source = createDocSource("https://example.com/docs/");

    // When / Then
    await expect(source.read("missing.md")).rejects.toThrow("HTTP 404");
    await expect(source.read("../other.md")).rejects.toThrow(
      "escapes the docs source",
    );
    await expect(source.read("https://evil.example/x.md")).rejects.toThrow(
      "escapes the docs source",
    );
  });
});

describe("withTrailingSlash", () => {
  it("appends a slash only when missing", () => {
    expect(withTrailingSlash("a")).toBe("a/");
    expect(withTrailingSlash("a/")).toBe("a/");
  });
});

describe("loadConfig", () => {
  it("uses the published site by default", () => {
    const config = loadConfig({});
    expect(config).toEqual({
      siteUrl: new URL("https://lichtblick-suite.github.io/docs/"),
      docsSource: "https://lichtblick-suite.github.io/docs/",
      log: true,
    });
  });

  it("reads overrides from the environment", () => {
    const config = loadConfig({
      LICHTBLICK_DOCS_SITE_URL: "https://example.com/docs",
      LICHTBLICK_DOCS_SOURCE: "./build",
      LICHTBLICK_DOCS_LOG: "OFF",
    });
    expect(config.siteUrl.href).toBe("https://example.com/docs/");
    expect(config.docsSource).toBe("./build");
    expect(config.log).toBe(false);
  });
});
