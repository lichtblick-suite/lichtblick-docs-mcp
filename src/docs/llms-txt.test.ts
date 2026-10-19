import { describe, expect, it } from "vitest";

import { FILES, SITE_URL } from "../testing/fake-docs.js";
import { parseLlmsTxt, toPagePath } from "./llms-txt.js";

describe("parseLlmsTxt", () => {
  it("parses pages per section and skips external links", () => {
    const entries = parseLlmsTxt(FILES["llms.txt"]!, SITE_URL);

    expect(entries.map((entry) => [entry.section, entry.path])).toEqual([
      ["Documentation", "docs/extensions/extension-api/panel-extension-context"],
      ["Documentation", "docs/connecting-to-data/frameworks/rosbridge"],
      ["Guides", "guides/create-custom-panel"],
    ]);
    expect(entries[0]?.url).toBe(
      "https://lichtblick-suite.github.io/docs/docs/extensions/extension-api/panel-extension-context",
    );
  });

  it("drops descriptions that are leftover markup", () => {
    const rosbridge = parseLlmsTxt(FILES["llms.txt"]!, SITE_URL).find((entry) => entry.title === "Rosbridge");
    expect(rosbridge?.description).toBe("");
  });
});

describe("toPagePath", () => {
  it.each([
    ["https://lichtblick-suite.github.io/docs/guides/create-custom-panel/", "guides/create-custom-panel"],
    ["https://lichtblick-suite.github.io/other/page", undefined],
    ["https://example.com/docs/guides/x", undefined],
  ])("%s -> %s", (url, expected) => {
    expect(toPagePath(url, SITE_URL)).toBe(expected);
  });
});
