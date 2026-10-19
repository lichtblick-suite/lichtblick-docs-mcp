import type { DocSource } from "../docs/source.js";

export const SITE_URL = new URL("https://lichtblick-suite.github.io/docs/");

export const FILES: Record<string, string> = {
  "llms.txt": `# Lichtblick Documentation

> An integrated visualization and diagnosis tool for robotics

## Documentation

- [PanelExtensionContext](https://lichtblick-suite.github.io/docs/docs/extensions/extension-api/panel-extension-context): The \`PanelExtensionContext\` is passed to your panel's \`initPanel()\` function.
- [Rosbridge](https://lichtblick-suite.github.io/docs/docs/connecting-to-data/frameworks/rosbridge): <div class="warning">
- [GitHub](https://github.com/Lichtblick-Suite/lichtblick): external link

## Guides

- [Create Custom Panel](https://lichtblick-suite.github.io/docs/guides/create-custom-panel): Build a custom panel extension.
`,
  "docs/extensions/extension-api/panel-extension-context.md": `# PanelExtensionContext

The \`PanelExtensionContext\` is passed to your panel's \`initPanel()\` function.

## Key Concepts

### RenderState

\`currentFrame\` holds new messages since the last render.

\`\`\`ts
## not a heading
context.watch("currentFrame");
\`\`\`
`,
  "docs/connecting-to-data/frameworks/rosbridge.md": `# Rosbridge

Connect to a live ROS stack through rosbridge websockets.
`,
  "guides/create-custom-panel.md": `# Create Custom Panel

Scaffold a new extension and register a panel with \`registerPanel\`.
`,
};

export function createFakeDocSource(files: Record<string, string> = FILES): DocSource {
  return {
    read(relativePath) {
      const contents = files[relativePath];
      return contents === undefined
        ? Promise.reject(new Error(`Not found: ${relativePath}`))
        : Promise.resolve(contents);
    },
  };
}
