import { describe, expect, it } from "vitest";

import { createFakeDocSource, FILES, SITE_URL } from "../testing/fake-docs.js";
import { DocsStore } from "./store.js";

describe("DocsStore", () => {
  const store = new DocsStore(createFakeDocSource(), SITE_URL);

  it("lists pages, optionally by section", async () => {
    expect(await store.list()).toHaveLength(3);
    expect((await store.list("guides")).map((page) => page.path)).toEqual(["guides/create-custom-panel"]);
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
});
