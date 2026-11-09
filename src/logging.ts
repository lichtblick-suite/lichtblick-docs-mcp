// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

export type Logger = (event: string, fields?: Record<string, unknown>) => void;

export const silentLogger: Logger = () => {};

/** Writes one JSON object per line, to stderr by default: stdout carries the MCP protocol. */
export function createLogger(
  write = (line: string): void => void process.stderr.write(`${line}\n`),
): Logger {
  return (event, fields) => {
    write(JSON.stringify({ ts: new Date().toISOString(), event, ...fields }));
  };
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
