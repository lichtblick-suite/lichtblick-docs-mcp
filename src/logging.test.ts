// SPDX-FileCopyrightText: Copyright (C) 2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from "vitest";

import { createLogger, errorMessage } from "./logging.js";

describe("createLogger", () => {
  it("writes one JSON object per event with a timestamp", () => {
    // Given
    const lines: string[] = [];
    const logger = createLogger((line) => lines.push(line));

    // When
    logger("ready", { version: "1.0.0" });
    logger("error");

    // Then
    expect(lines.map((line) => JSON.parse(line) as unknown)).toEqual([
      { ts: expect.any(String) as string, event: "ready", version: "1.0.0" },
      { ts: expect.any(String) as string, event: "error" },
    ]);
  });
});

describe("errorMessage", () => {
  it("uses the message of errors and stringifies anything else", () => {
    expect(errorMessage(new Error("bad"))).toBe("bad");
    expect(errorMessage(42)).toBe("42");
  });
});
