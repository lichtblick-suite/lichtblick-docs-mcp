export type DocPageEntry = {
  /** Page path relative to the site URL, e.g. `docs/extensions/extension-api/panel-extension-context`. */
  path: string;
  title: string;
  url: string;
  description: string;
  section: string;
};

const LINK_LINE = /^- \[(?<title>[^\]]+)\]\((?<url>[^)\s]+)\)(?<rest>.*)$/;

export function parseLlmsTxt(text: string, siteUrl: URL): DocPageEntry[] {
  const entries: DocPageEntry[] = [];
  let section = "";

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("## ")) {
      section = line.slice(3).trim();
      continue;
    }
    const groups = LINK_LINE.exec(line)?.groups;
    if (!groups?.title || !groups.url) {
      continue;
    }
    const path = toPagePath(groups.url, siteUrl);
    if (!path) {
      continue;
    }
    entries.push({
      path,
      title: groups.title,
      url: new URL(path, siteUrl).href,
      description: groups.rest?.startsWith(":") ? cleanDescription(groups.rest.slice(1)) : "",
      section,
    });
  }

  return entries;
}

/** Returns the page path for URLs under `siteUrl`, or undefined for external links. */
export function toPagePath(url: string, siteUrl: URL): string | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url, siteUrl);
  } catch {
    return undefined;
  }
  if (parsed.origin !== siteUrl.origin || !parsed.pathname.startsWith(siteUrl.pathname)) {
    return undefined;
  }
  return trimSlashes(parsed.pathname.slice(siteUrl.pathname.length)) || undefined;
}

export function trimSlashes(value: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && value[start] === "/") start++;
  while (end > start && value[end - 1] === "/") end--;
  return value.slice(start, end);
}

// docusaurus-plugin-llms falls back to the first body line, which is sometimes an admonition or HTML tag.
function cleanDescription(description: string): string {
  const trimmed = description.trim();
  return trimmed.startsWith("<") || trimmed.startsWith(":::") ? "" : trimmed;
}
