# SayElse

SayElse is a Chrome extension for rewriting text. Select text in a page, pick an action, and get an alternative you can accept or discard. It talks to any OpenAI-compatible server you choose, so the model you use stays under your control.

## How it works

Two surfaces share one rewrite engine.

**Inline.** Select text in an input, textarea, or contenteditable region and a small action bar appears next to it: Paraphrase, Formal, or Shorter. Each action sends one request that returns two alternatives, Closest and Distinct, in a popup beneath the bar. The page text stays untouched until you click one. After that the extension replaces the original only if the selection still matches what it captured.

**Side panel.** The toolbar button and the context menu item open the full panel, where you can paste a draft and pick a rewrite style.

Both surfaces offer the same three styles:

| Style | Effect |
| --- | --- |
| Paraphrase | Fresh wording, same meaning |
| Formal | Replaces casual wording and contractions with professional equivalents |
| Shorter | Cuts repetition and filler and tightens each sentence |

Each style fixes the voice, the strength of the edit, and the target length, so you pick one action instead of tuning several settings.

## Requirements

- Chrome 114 or newer
- Node.js 22 or newer
- pnpm 10
- An OpenAI-compatible server you can reach

## Setup

```bash
pnpm install
pnpm dev
```

Then open `chrome://extensions`, turn on Developer mode, choose Load unpacked, and select `.output/chrome-mv3`.

## Connecting a server

SayElse speaks the standard OpenAI chat-completions API, so any server that implements it will work: a hosted provider, a local router, or a self-hosted model.

Open Settings and enter the **endpoint URL** — the base URL of the server, including its API path:

```text
https://api.example.com/v1
http://127.0.0.1:20128/v1
http://127.0.0.1:11434/v1
```

A pasted link that already ends in `/chat/completions` or `/models` is trimmed down to the base for you. If you leave off the scheme, SayElse assumes `https://`.

Add your **API key** in the same panel if the server needs one. It is sent as an `Authorization: Bearer` header; leave it blank for servers that allow anonymous access.

Press **Save endpoint**. Chrome asks permission to reach that host the first time, and SayElse requests access to that origin only — never a blanket site permission. A loopback address such as `127.0.0.1` or `localhost` is already allowed by default, so no prompt appears.

SayElse then calls `GET {base}/models` to populate the model list and `POST {base}/chat/completions` for every rewrite, streaming responses as they arrive. Changing the endpoint refreshes the model list automatically.

A local server is not the same as local inference. Your server may forward your text to whichever provider it is configured with, and SayElse has no way to see or control that. Review your setup before sending anything sensitive.

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
    api/                 OpenAI-compatible client, SSE parsing, endpoint helpers
    browser/             selection capture, replacement, inline layout, host permissions
    storage/             settings, selection handoff
    prompts.ts           prompt construction and validation
    constants.ts         shared limits and option lists
```

Tests sit next to the code they cover, as `*.test.ts` files. The whole suite is 88 tests across 12 files and runs in jsdom.

## Privacy

SayElse has no account, no analytics, no telemetry, and no remote assets. Everything it stores stays in Chrome's local extension storage, and the only network requests it makes go to the endpoint you configure. See [PRIVACY.md](PRIVACY.md) for the full picture, including what the stored API key is and is not.

## Status

The extension is usable as an unpacked build today. Publishing it to the Chrome Web Store still needs a review of the user-configurable host permission, the content script disclosures, and the transport to non-loopback endpoints, plus a hosted version of the privacy policy, since the store requires one on a public URL.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Bug reports and pull requests are welcome.

## License

[MIT](LICENSE). Copyright (c) 2026 Agung Darmanto.
