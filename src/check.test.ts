// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runCheck } from "./check.js";
import { loadConfig } from "./config.js";
import { FILES } from "./testing/fake-docs.js";

describe("runCheck", () => {
  let buildDir: string;
  let output: string[];
  const print = (line: string) => output.push(line);

  const writeBuild = async (files: Record<string, string>) => {
    for (const [path, contents] of Object.entries(files)) {
      const file = join(buildDir, path);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, contents);
    }
  };

  beforeEach(async () => {
    buildDir = await mkdtemp(join(tmpdir(), "docs-mcp-check-"));
    output = [];
  });

  afterEach(async () => {
    await rm(buildDir, { recursive: true, force: true });
  });

  it("passes when every page of llms.txt resolves", async () => {
    // Given
    await writeBuild(FILES);

    // When
    const code = await runCheck(loadConfig({ LICHTBLICK_DOCS_SOURCE: buildDir }), print);

    // Then
    expect(code).toBe(0);
    expect(output).toEqual([`3/3 pages resolved (source: ${buildDir})`]);
  });

  it("fails and lists the pages that do not resolve", async () => {
    // Given
    const { "guides/create-custom-panel.md": _missing, ...files } = FILES;
    await writeBuild(files);

    // When
    const code = await runCheck(loadConfig({ LICHTBLICK_DOCS_SOURCE: buildDir }), print);

    // Then
    expect(code).toBe(1);
    expect(output[0]).toMatch(/^FAIL guides\/create-custom-panel: /);
    expect(output.at(-1)).toBe(`2/3 pages resolved (source: ${buildDir})`);
  });

  it("fails when llms.txt lists no pages", async () => {
    // Given
    await writeBuild({ "llms.txt": "# Empty\n" });

    // When
    const code = await runCheck(loadConfig({ LICHTBLICK_DOCS_SOURCE: buildDir }), print);

    // Then
    expect(code).toBe(1);
    expect(output).toEqual([`FAIL: llms.txt from ${buildDir} lists no pages`]);
  });

  it("fails when llms.txt cannot be read", async () => {
    // When
    const code = await runCheck(loadConfig({ LICHTBLICK_DOCS_SOURCE: buildDir }), print);

    // Then
    expect(code).toBe(1);
    expect(output[0]).toMatch(/^FAIL: could not read llms.txt from /);
  });
});
