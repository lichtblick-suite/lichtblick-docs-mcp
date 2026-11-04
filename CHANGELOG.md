# Changelog

All notable changes to this project are documented in this file. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-11-03

### Added

- First release as the npm package `@lichtblick/docs-mcp`, published from GitHub Actions with npm provenance and
  an `npm-shrinkwrap.json` that locks transitive dependencies. No build step runs on the user's machine.
- Tools `docs_search`, `docs_fetch`, `docs_list`, `extension_api_get` and `extension_api_list`, and
  `lichtblick-docs://` resources for every documentation page.
- `check` subcommand that verifies that every `llms.txt` entry resolves to its `.md` page, run in CI as a smoke test.
- Every tool call is logged to stderr as JSON (tool, arguments, duration), plus a one-line summary of
  the indexed and skipped pages. Set `LICHTBLICK_DOCS_LOG=off` to disable it.
- The search index is built in the background on startup, so the first `docs_search` does not wait for every page.
- Server instructions and tool descriptions that tell agents to prefer these tools over web search.

### Changed

- Licensed under MPL-2.0; the package is no longer private.
- `@lichtblick/suite` bumped to 1.30.0.

[Unreleased]: https://github.com/lichtblick-suite/lichtblick-docs-mcp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/lichtblick-suite/lichtblick-docs-mcp/releases/tag/v0.1.0
