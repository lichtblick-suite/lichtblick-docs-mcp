import { withTrailingSlash } from "./docs/source.js";

const DEFAULT_SITE_URL = "https://lichtblick-suite.github.io/docs/";

export type Config = {
  /** Public URL of the docs site; links in llms.txt are resolved against it. */
  siteUrl: URL;
  /** URL or local build directory that serves llms.txt and the per-page .md files. */
  docsSource: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const siteUrl = new URL(withTrailingSlash(env.LICHTBLICK_DOCS_SITE_URL ?? DEFAULT_SITE_URL));
  return { siteUrl, docsSource: env.LICHTBLICK_DOCS_SOURCE ?? siteUrl.href };
}
