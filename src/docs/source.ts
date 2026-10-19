import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";

export type DocSource = {
  read(relativePath: string): Promise<string>;
};

const FETCH_TIMEOUT_MS = 10_000;

export function withTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

/** `location` is either an http(s) URL or a local Docusaurus build directory. */
export function createDocSource(location: string): DocSource {
  return /^https?:\/\//i.test(location)
    ? httpSource(new URL(withTrailingSlash(location)))
    : fileSource(resolve(location));
}

function httpSource(base: URL): DocSource {
  return {
    async read(relativePath) {
      const url = new URL(relativePath, base);
      if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) {
        throw new Error(`Path escapes the docs source: ${relativePath}`);
      }
      const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!response.ok) {
        throw new Error(`GET ${url.href} failed with HTTP ${response.status}`);
      }
      return response.text();
    },
  };
}

function fileSource(root: string): DocSource {
  return {
    read(relativePath) {
      const file = resolve(root, relativePath);
      if (!file.startsWith(root + sep)) {
        throw new Error(`Path escapes the docs source: ${relativePath}`);
      }
      return readFile(file, "utf8");
    },
  };
}
