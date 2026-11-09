// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import lichtblickPlugin from "@lichtblick/eslint-plugin";

export default [
  {
    ignores: ["dist/**", "coverage/**"],
  },
  ...lichtblickPlugin.configs.base,
  ...lichtblickPlugin.configs.typescript.map((config) => ({
    ...config,
    files: ["**/*.ts"],
  })),
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        // vitest.config.ts is outside tsconfig.json's `include`.
        projectService: { allowDefaultProject: ["*.ts"] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript already checks named imports, and import/named cannot resolve `.js` specifiers to `.ts` files.
      "import/named": "off",
      // Same overrides as lichtblick.
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-empty-function": "off",
    },
  },
  {
    rules: {
      "@lichtblick/license-header": ["error", { licenseType: "MPL-2.0" }],
    },
  },
  {
    // The rule only allows the header on the first line, which conflicts with the shebang.
    files: ["src/index.ts"],
    rules: {
      "@lichtblick/license-header": "off",
    },
  },
];
