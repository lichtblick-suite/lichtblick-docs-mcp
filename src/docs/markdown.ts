export type MarkdownSection = {
  heading: string;
  anchor: string;
  text: string;
};

const FENCE = /^\s*(```|~~~)/;
const HEADING = /^#{2,3} (.*)$/;

/** Splits a page into its intro plus one section per `##`/`###` heading. */
export function splitSections(markdown: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  let heading = "";
  let lines: string[] = [];
  let inFence = false;

  const flush = () => {
    const text = lines.join("\n").trim();
    if (text) {
      sections.push({ heading, anchor: slugify(heading), text });
    }
  };

  for (const line of markdown.split("\n")) {
    if (FENCE.test(line)) {
      inFence = !inFence;
    }
    const nextHeading = inFence ? undefined : HEADING.exec(line)?.[1]?.trim();
    if (nextHeading) {
      flush();
      heading = nextHeading;
      lines = [];
    } else {
      lines.push(line);
    }
  }
  flush();

  return sections;
}

/** Approximates the Docusaurus heading id so search hits can link to the section. */
export function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}
