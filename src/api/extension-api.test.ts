import { describe, expect, it } from "vitest";

import { ExtensionApi, parseModule } from "./extension-api.js";

describe("parseModule", () => {
  const source = `// SPDX-License-Identifier: MPL-2.0

import type { Other } from "./other";

export type { Reexported, Original as Renamed } from "./other";

/** A documented type. */
export type Documented = { value: number };

type Internal = string;

// Entry point comment
export interface Module {
  activate(): void;
}

export const ICONS = ["Add"] as const;
`;

  it("collects exported declarations with their attached comments", () => {
    const { declarations } = parseModule("index.ts", source);

    expect([...declarations.keys()]).toEqual(["Documented", "Module", "ICONS"]);
    expect(declarations.get("Documented")?.source).toBe("/** A documented type. */\nexport type Documented = { value: number };");
    expect(declarations.get("Module")?.source.startsWith("// Entry point comment\nexport interface Module")).toBe(true);
    expect(declarations.get("ICONS")?.kind).toBe("const");
  });

  it("does not attach comments separated by a blank line", () => {
    const { declarations } = parseModule("index.ts", source);
    expect([...declarations.values()].some((symbol) => symbol.source.includes("SPDX"))).toBe(false);
  });

  it("collects named re-exports", () => {
    expect(parseModule("index.ts", source).reExports).toEqual([
      { name: "Reexported", exportedAs: "Reexported", from: "./other" },
      { name: "Original", exportedAs: "Renamed", from: "./other" },
    ]);
  });
});

describe("ExtensionApi", () => {
  const api = new ExtensionApi();

  it("loads the public API of the installed @lichtblick/suite", async () => {
    const { version, symbols } = await api.load();

    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(symbols.get("PanelExtensionContext")?.source).toContain("panelElement");
    expect(symbols.get("CameraInfo")?.file).toBe("cameraModels.ts");
    // Exported from immutable.ts but not re-exported by index.ts.
    expect(symbols.has("Primitive")).toBe(false);
  });

  it("finds symbols case-insensitively and suggests close names", async () => {
    expect((await api.get("panelextensioncontext"))?.name).toBe("PanelExtensionContext");
    expect(await api.suggest("SettingsTreeField")).toContain("SettingsTreeFieldNumber");
  });
});
