// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// The package entry also loads its shared configs, which need peer plugins we don't use.
import licenseHeader from "@lichtblick/eslint-plugin/rules/license-header.cjs";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: ["dist/**", "coverage/**"],
  },
  {
    files: ["**/*.ts", "**/*.mjs", "**/*.js"],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      "@lichtblick": { rules: { "license-header": licenseHeader } },
    },
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
