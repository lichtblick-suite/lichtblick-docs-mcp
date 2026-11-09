// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import type { Config } from "./config.js";
import { createDocSource } from "./docs/source.js";
import { DocsStore } from "./docs/store.js";
import { errorMessage } from "./logging.js";

/** Verifies that every page listed in llms.txt resolves to its .md page; returns the process exit code. */
export async function runCheck(
  config: Config,
  print: (line: string) => void = (line) => process.stderr.write(`${line}\n`),
): Promise<number> {
  const source = config.docsSource;
  try {
    const { pages, failures } = await new DocsStore(
      createDocSource(source),
      config.siteUrl,
    ).verify();
    if (pages === 0) {
      print(`FAIL: llms.txt from ${source} lists no pages`);
      return 1;
    }
    for (const { path, reason } of failures) {
      print(`FAIL ${path}: ${reason}`);
    }
    print(
      `${pages - failures.length}/${pages} pages resolved (source: ${source})`,
    );
    return failures.length === 0 ? 0 : 1;
  } catch (error) {
    print(
      `FAIL: could not read llms.txt from ${source}: ${errorMessage(error)}`,
    );
    return 1;
  }
}
