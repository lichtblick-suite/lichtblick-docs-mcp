// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it, vi } from "vitest";

import { createLogger } from "../logging.js";
import { DocsStore } from "./store.js";
import { createFakeDocSource, FILES, SITE_URL } from "../testing/fake-docs.js";

describe("DocsStore", () => {
  const store = new DocsStore(createFakeDocSource(), SITE_URL);

  it("lists pages, optionally by section", async () => {
    expect(await store.list()).toHaveLength(3);
    expect((await store.list("guides")).map((page) => page.path)).toEqual([
      "guides/create-custom-panel",
    ]);
  });

  it.each([
    "guides/create-custom-panel",
    "/guides/create-custom-panel.md",
    "guides/create-custom-panel#intro",
    "https://lichtblick-suite.github.io/docs/guides/create-custom-panel",
  ])("fetches a page by %s", async (input) => {
    const page = await store.fetch(input);
    expect(page?.markdown).toBe(FILES["guides/create-custom-panel.md"]);
  });

  it("returns undefined for pages not listed in llms.txt", async () => {
    expect(await store.fetch("../package")).toBeUndefined();
  });

  it("ranks the matching section first and links to its anchor", async () => {
    const [first] = await store.search("currentFrame render", 5);

    expect(first).toMatchObject({
      path: "docs/extensions/extension-api/panel-extension-context",
      heading: "RenderState",
      url: "https://lichtblick-suite.github.io/docs/docs/extensions/extension-api/panel-extension-context#renderstate",
    });
    expect(first?.snippet).toContain("currentFrame");
  });

  it("indexes the remaining pages when one page fails to load", async () => {
    const files = { ...FILES };
    delete files["guides/create-custom-panel.md"];
    const partial = new DocsStore(createFakeDocSource(files), SITE_URL);

    expect(await partial.search("rosbridge", 5)).not.toHaveLength(0);
  });

  it("verifies every page and reports the ones that fail to load", async () => {
    // Given
    const files = { ...FILES };
    delete files["guides/create-custom-panel.md"];
    const partial = new DocsStore(createFakeDocSource(files), SITE_URL);

    // When
    const result = await partial.verify();

    // Then
    expect(result.pages).toBe(3);
    expect(result.failures).toEqual([
      {
        path: "guides/create-custom-panel",
        reason: "Not found: guides/create-custom-panel.md",
      },
    ]);
  });

  it("logs a docs_index summary with skipped pages when warming up", async () => {
    // Given
    const files = { ...FILES };
    delete files["guides/create-custom-panel.md"];
    const lines: string[] = [];
    const logger = createLogger((line) => lines.push(line));
    const partial = new DocsStore(createFakeDocSource(files), SITE_URL, logger);

    // When
    partial.warmUp();

    // Then
    await vi.waitFor(() => {
      expect(lines).toHaveLength(1);
    });
    expect(JSON.parse(lines[0]!)).toMatchObject({
      event: "docs_index",
      pages: 2,
      skipped: [
        expect.stringMatching(/^guides\/create-custom-panel \(/) as string,
      ],
    });
  });

  it("logs an error and retries later when llms.txt cannot be read during warm-up", async () => {
    // Given
    const lines: string[] = [];
    const logger = createLogger((line) => lines.push(line));
    const files: Record<string, string> = {};
    const retrying = new DocsStore(
      createFakeDocSource(files),
      SITE_URL,
      logger,
    );

    // When
    retrying.warmUp();
    await vi.waitFor(() => {
      expect(lines.some((line) => line.includes('"event":"error"'))).toBe(true);
    });
    Object.assign(files, FILES);

    // Then
    expect(await retrying.search("rosbridge", 5)).not.toHaveLength(0);
  });
});
