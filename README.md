# SayElse

SayElse is a Chrome extension for rewriting text. Select text in a page, pick an action, and get an alternative you can accept or discard. It talks to a 9Router instance running on your own machine, so the model you use stays under your control.

## How it works

Two surfaces share one rewrite engine.

**Inline.** Select text in an input, textarea, or contenteditable region and a small action bar appears next to it: Paraphrase, Formal, or Shorter. Each action sends one request that returns two alternatives, Closest and Distinct, in a popup beneath the bar. The page text stays untouched until you click one. After that the extension replaces the original only if the selection still matches what it captured.

**Side panel.** The toolbar button and the context menu item open the full panel, where you can paste a draft and use the complete set of controls.

Both surfaces cover the same operations:

| Operation | Effect |
| --- | --- |
| Paraphrase | Fresh wording, same meaning |
| More formal | Replaces casual wording and contractions |
| More casual | Loosens stiff phrasing |
| Make concise | Cuts repetition and filler |
| Add detail | Expands on what the source already implies |
| Fix grammar | Corrects grammar, spelling, and punctuation |
| Originality check | Substantial rewrite, not a plagiarism detector |

Alongside the operation you can set a tone (neutral, friendly, professional, confident, persuasive), an intensity (light, balanced, strong), and a length (shorter, similar, longer).

## Requirements

- Chrome 114 or newer
- Node.js 22 or newer
- pnpm 10
- 9Router running locally

## Setup

```bash
pnpm install
pnpm dev
```

Then open `chrome://extensions`, turn on Developer mode, choose Load unpacked, and select `.output/chrome-mv3`.

## Connecting 9Router

SayElse talks to a fixed endpoint:

```text
http://127.0.0.1:20128/v1
```

Start 9Router on port `20128`, open Settings in SayElse, and enter its token if it needs one. SayElse then calls `GET /v1/models` to populate the model list and `POST /v1/chat/completions` for every rewrite, streaming responses as they arrive.

A local router is not the same as local inference. 9Router may forward your text to whichever provider is configured inside it, and SayElse has no way to see or control that. Review your router setup before sending anything sensitive.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the dev server with hot reload |
| `pnpm typecheck` | Generate WXT types and run `tsc --noEmit` |
| `pnpm test` | Run the test suite once |
| `pnpm test:watch` | Run the test suite in watch mode |
| `pnpm build` | Build the production extension into `.output` |

Reload the unpacked extension in `chrome://extensions` after each `pnpm build`.

## Project layout

```text
src/
  entrypoints/
    background.ts        service worker: context menu, side panel, rewrite requests
    inline.content.ts    inline action bar and popup
    sidepanel/           the full panel UI
  lib/
    api/                 9Router client, SSE parsing
    browser/             selection capture, replacement, inline layout
    storage/             settings, history, selection handoff
    prompts.ts           prompt construction and validation
    constants.ts         shared limits and option lists
```

Tests sit next to the code they cover, as `*.test.ts` files. The whole suite is 36 tests across 10 files and runs in jsdom.

## Privacy

SayElse has no account, no analytics, no telemetry, and no remote assets. Everything it stores stays in Chrome's local extension storage, and the only network request it makes goes to the loopback address above. See [PRIVACY.md](PRIVACY.md) for the full picture, including what the stored token is and is not.

## Status

The extension is usable as an unpacked build today. Publishing it to the Chrome Web Store still needs a review of the loopback HTTP transport, CORS behaviour, and content script disclosures, plus a hosted version of the privacy policy, since the store requires one on a public URL.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Bug reports and pull requests are welcome.

## License

[MIT](LICENSE). Copyright (c) 2026 Agung Darmanto.
