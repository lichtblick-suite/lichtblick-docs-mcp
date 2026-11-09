# Lichtblick documentation MCP server

<!--
Copy this section into `.github/copilot-instructions.md` (GitHub Copilot), `AGENTS.md` (Cursor, Codex) or `CLAUDE.md`
(Claude Code) of a Lichtblick repository, for example the docs repository or an extension repository. It assumes
the `lichtblick-docs` MCP server is configured as described in the README of @lichtblick/docs-mcp.
-->

This repository works with [Lichtblick](https://github.com/lichtblick-suite/lichtblick) and its extension API,
`@lichtblick/suite`. Lichtblick is a fork of Foxglove Studio, and its documentation and APIs differ from Foxglove's.
Do not answer from memory or from Foxglove documentation.

Use the tools of the `lichtblick-docs` MCP server before any web search:

- `docs_search` with a few keywords for any question about Lichtblick panels, data sources, layouts, settings,
  extensions, custom panels, message converters or camera models. Then call `docs_fetch` with the returned path to
  read the whole page.
- `extension_api_get` for every `@lichtblick/suite` type you use or change (for example `ExtensionContext`,
  `PanelExtensionContext`, `RenderState`, `SettingsTreeNode`, `MessageEvent`), and use the exact signatures it
  returns. Use `extension_api_list` if you do not know the symbol name.
- `docs_list` to see every documentation page when a search is not enough.

Cite the documentation URLs returned by the tools. Only use web search if the tools return nothing relevant, and say
so in the answer.
