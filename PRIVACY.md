# Privacy

Last updated: September 25, 2026

SayElse is a local-first Chrome extension. It has no account, no analytics, no advertising, no telemetry, and no payment flow. Everything it stores stays in your browser profile.

## What is processed

When you select editable text and invoke SayElse, the extension processes:

- the text you selected;
- the location and range of the selected element, which is needed to offer actions and to replace the selection safely;
- the rewrite settings you chose, such as operation, tone, intensity, and length;
- the 9Router model you selected;
- the 9Router API token you entered, if your router requires one.

Selected text is sent to the fixed local endpoint at `http://127.0.0.1:20128/v1` when you start a rewrite. 9Router may forward that text to the model provider configured inside it. SayElse cannot see or control that provider's retention practices, so review your 9Router configuration before sending anything sensitive.

## What is stored

Chrome local extension storage holds:

- your 9Router token, if you entered one;
- the selected model and your default rewrite settings;
- your theme preference;
- your rewrite history, bounded to at most 25 entries and roughly 120 KB total.

Selection handoff data is used only by the explicit context menu and side panel flows, and it is deleted once the side panel consumes it. Inline selections are captured only for the rewrite in progress and for the guarded replacement that follows.

Password fields are excluded. Inline rewrite results are not added to history; only successful side panel generations are saved.

The token is never included in history or in generation diagnostics. Chrome extension storage is persistent browser-profile storage, not an encrypted credential vault, so treat it as you would any other file in your profile.

## What runs on web pages

The inline assistant runs on ordinary HTTP and HTTPS web pages so it can appear next to selected text in inputs, textareas, and contenteditable regions. It does not run on browser settings pages or other restricted Chrome pages.

It does not read page content continuously. The action bar is created only after you make an eligible selection. Choosing an inline action sends the text of that selection to the local 9Router endpoint to generate two alternatives.

Your original page text is never modified until you choose one of the alternatives, and replacement happens only when the captured target and range still match the page.

## Your controls

Settings lets you:

- delete individual history entries;
- clear all history;
- clear the stored 9Router token;
- clear all SayElse settings and history.

Removing the extension also removes its extension storage from the Chrome profile.

## Network scope

SayElse bundles all of its executable code and UI assets. It makes no remote service request except to the fixed local 9Router endpoint. There are no remote fonts, no CDN assets, and no third-party runtime dependencies.

## Known limitation

The extension communicates with 9Router over plain HTTP on the loopback interface, and its requests are subject to CORS rules enforced by the router. A public Chrome Web Store release is on hold until that transport and the content script disclosures have been reviewed against store policy.

## Changes to this policy

Any change to how data is handled will be reflected here, with the date at the top updated. SayElse is pre-1.0, so treat the current text as the source of truth rather than a stable contract.
