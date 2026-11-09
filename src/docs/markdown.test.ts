// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from "vitest";

import { slugify, splitSections } from "./markdown.js";
import { FILES } from "../testing/fake-docs.js";

describe("splitSections", () => {
  it("splits on h2/h3 headings and ignores headings inside code fences", () => {
    const sections = splitSections(
      FILES["docs/extensions/extension-api/panel-extension-context.md"]!,
    );

    expect(sections.map((section) => section.heading)).toEqual([
      "",
      "RenderState",
    ]);
    expect(sections[1]?.text).toContain("## not a heading");
  });
});

describe("slugify", () => {
  it("matches Docusaurus-style heading ids", () => {
    expect(slugify("Key Concepts")).toBe("key-concepts");
    expect(slugify("`context.watch()` usage")).toBe("contextwatch-usage");
  });
});
