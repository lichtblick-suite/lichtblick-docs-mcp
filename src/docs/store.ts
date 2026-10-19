import MiniSearch from "minisearch";

import { parseLlmsTxt, toPagePath, trimSlashes, type DocPageEntry } from "./llms-txt.js";
import { splitSections } from "./markdown.js";
import type { DocSource } from "./source.js";

export type DocPage = DocPageEntry & { markdown: string };

export type SearchHit = {
  path: string;
  title: string;
  heading: string;
  url: string;
  snippet: string;
  score: number;
};

type IndexedSection = {
  id: string;
  path: string;
  title: string;
  heading: string;
  anchor: string;
  text: string;
};

const SNIPPET_LENGTH = 280;

export class DocsStore {
  readonly #source: DocSource;
  readonly #siteUrl: URL;
  #entries: Promise<Map<string, DocPageEntry>> | undefined;
  #index: Promise<{ search: MiniSearch<IndexedSection>; sections: Map<string, IndexedSection> }> | undefined;
  readonly #markdown = new Map<string, Promise<string>>();

  constructor(source: DocSource, siteUrl: URL) {
    this.#source = source;
    this.#siteUrl = siteUrl;
  }

  async list(section?: string): Promise<DocPageEntry[]> {
    const entries = [...(await this.#loadEntries()).values()];
    return section
      ? entries.filter((entry) => entry.section.toLowerCase() === section.toLowerCase())
      : entries;
  }

  /** Accepts a page path, a path with `.md`/anchor, or a full page URL. */
  async fetch(pathOrUrl: string): Promise<DocPage | undefined> {
    const entry = (await this.#loadEntries()).get(this.#normalizePath(pathOrUrl));
    return entry && { ...entry, markdown: await this.#loadMarkdown(entry.path) };
  }

  async search(query: string, limit: number): Promise<SearchHit[]> {
    const { search, sections } = await this.#loadIndex();
    return search
      .search(query)
      .slice(0, limit)
      .flatMap((result) => {
        const section = sections.get(result.id as string);
        if (!section) {
          return [];
        }
        const pageUrl = new URL(section.path, this.#siteUrl).href;
        return [
          {
            path: section.path,
            title: section.title,
            heading: section.heading,
            url: section.anchor ? `${pageUrl}#${section.anchor}` : pageUrl,
            snippet: snippet(section.text, result.terms),
            score: result.score,
          },
        ];
      });
  }

  #normalizePath(pathOrUrl: string): string {
    if (/^https?:\/\//i.test(pathOrUrl)) {
      return toPagePath(pathOrUrl, this.#siteUrl) ?? "";
    }
    const withoutAnchor = pathOrUrl.split("#")[0] ?? "";
    return trimSlashes(withoutAnchor.endsWith(".md") ? withoutAnchor.slice(0, -3) : withoutAnchor);
  }

  #loadEntries(): Promise<Map<string, DocPageEntry>> {
    if (!this.#entries) {
      this.#entries = this.#source
        .read("llms.txt")
        .then((text) => new Map(parseLlmsTxt(text, this.#siteUrl).map((entry) => [entry.path, entry])));
      this.#entries.catch(() => (this.#entries = undefined));
    }
    return this.#entries;
  }

  #loadMarkdown(path: string): Promise<string> {
    let markdown = this.#markdown.get(path);
    if (!markdown) {
      markdown = this.#source.read(`${path}.md`);
      this.#markdown.set(path, markdown);
      markdown.catch(() => this.#markdown.delete(path));
    }
    return markdown;
  }

  #loadIndex() {
    if (!this.#index) {
      this.#index = this.#buildIndex();
      this.#index.catch(() => (this.#index = undefined));
    }
    return this.#index;
  }

  async #buildIndex() {
    const entries = [...(await this.#loadEntries()).values()];
    const pages = await Promise.allSettled(
      entries.map(async (entry) => ({ entry, markdown: await this.#loadMarkdown(entry.path) })),
    );

    const sections = new Map<string, IndexedSection>();
    for (const page of pages) {
      if (page.status === "rejected") {
        console.error(`Skipping page that failed to load: ${String(page.reason)}`);
        continue;
      }
      const { entry, markdown } = page.value;
      splitSections(markdown).forEach((section, i) => {
        const id = `${entry.path}::${i}`;
        sections.set(id, { id, path: entry.path, title: entry.title, ...section });
      });
    }

    const search = new MiniSearch<IndexedSection>({
      fields: ["title", "heading", "text"],
      searchOptions: { boost: { title: 3, heading: 2 }, prefix: true, fuzzy: 0.2 },
    });
    search.addAll([...sections.values()]);
    return { search, sections };
  }
}

function snippet(text: string, terms: string[]): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const lower = flat.toLowerCase();
  const firstHit = Math.min(
    ...terms.map((term) => lower.indexOf(term.toLowerCase())).filter((index) => index >= 0),
  );
  const start = Number.isFinite(firstHit) ? Math.max(0, firstHit - 80) : 0;
  const end = Math.min(flat.length, start + SNIPPET_LENGTH);
  return `${start > 0 ? "…" : ""}${flat.slice(start, end)}${end < flat.length ? "…" : ""}`;
}
