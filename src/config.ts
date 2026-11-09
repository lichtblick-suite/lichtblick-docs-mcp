// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { withTrailingSlash } from "./docs/source.js";

const DEFAULT_SITE_URL = "https://lichtblick-suite.github.io/docs/";

export type Config = {
  /** Public URL of the docs site; links in llms.txt are resolved against it. */
  siteUrl: URL;
  /** URL or local build directory that serves llms.txt and the per-page .md files. */
  docsSource: string;
  /** Logs every tool call to stderr unless LICHTBLICK_DOCS_LOG is `off`. */
  log: boolean;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const siteUrl = new URL(withTrailingSlash(env.LICHTBLICK_DOCS_SITE_URL ?? DEFAULT_SITE_URL));
  return {
    siteUrl,
    docsSource: env.LICHTBLICK_DOCS_SOURCE ?? siteUrl.href,
    log: env.LICHTBLICK_DOCS_LOG?.trim().toLowerCase() !== "off",
  };
}
