# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows [semantic versioning](https://semver.org/spec/v2.0.0.html).

The project is pre-1.0, so anything may change before the first stable release.

## [Unreleased]

Nothing yet.

## [0.1.0] - 2026-09-25

First public release, usable as an unpacked build.

### Added

- Inline action bar for eligible text selections in inputs, textareas, and contenteditable regions, with Paraphrase, Formal, and Shorter actions.
- Two-alternative inline rewrite, labeled Closest and Distinct, rendered in a popup beneath the action bar.
- Guarded replacement. Page text changes only after an alternative is chosen, and only if the captured target and range still match.
- Side panel opened from the toolbar action and from a context menu item, covering the full rewrite workflow with streaming output, Stop, Retry, Copy, and guarded Replace.
- Rewrite controls for operation, tone, intensity, and length.
- 9Router client over an OpenAI-compatible API, with model discovery and streamed completions.
- Local rewrite history and settings, with delete and clear controls.
- Light, dark, and system themes.
- Unit tests across the router client, SSE parsing, selection handling, inline layout, message schemas, storage, and prompts.

[Unreleased]: https://github.com/[owner]/sayelse/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/[owner]/sayelse/releases/tag/v0.1.0
