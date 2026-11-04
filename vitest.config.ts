// SPDX-FileCopyrightText: Copyright (C) 2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // index.ts only wires the stdio transport; it is covered by the smoke test in CI.
      exclude: ["src/**/*.test.ts", "src/testing/**", "src/index.ts"],
      reporter: ["text", "text-summary", "lcov"],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
});
