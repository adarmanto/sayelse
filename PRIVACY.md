# Privacy

Last updated: September 26, 2026

SayElse is a local-first Chrome extension. It has no account, no analytics, no advertising, no telemetry, and no payment flow. Everything it stores stays in your browser profile.

## What is processed

When you select editable text and invoke SayElse, the extension processes:

- the text you selected;
- the location and range of the selected element, which is needed to offer actions and to replace the selection safely;
- the rewrite style you chose;
- the model you selected;
- the endpoint URL and API key you entered, if your server requires a key.

Selected text is sent to the endpoint URL you configured when you start a rewrite. SayElse contacts no other server. That endpoint may forward the text to a model provider you did not choose, and SayElse cannot see or control what happens there, so review your server's configuration and its provider's privacy policy before sending anything sensitive.

Saving a model also sends a request to the same endpoint. It carries the model ID and a fixed placeholder message, never any text of yours, and it exists so an unlisted model can be verified before it is stored.

## What is stored

Chrome local extension storage holds:

- your endpoint URL and API key, if you entered a key;
- the selected model and your default rewrite style;
- your theme preference.

SayElse does not keep a history of your rewrites. Nothing you rewrite is written to storage; a result exists only in the panel until you close or reload it.

Selection handoff data is used only by the explicit context menu and side panel flows, and it is deleted once the side panel consumes it. Inline selections are captured only for the rewrite in progress and for the guarded replacement that follows.

Password fields are excluded.

The API key is never included in generation diagnostics. Chrome extension storage is persistent browser-profile storage, not an encrypted credential vault, so treat it as you would any other file in your profile. If you point SayElse at a hosted provider, that key may grant access to a paid account.

## What runs on web pages

The inline assistant runs on ordinary HTTP and HTTPS web pages so it can appear next to selected text in inputs, textareas, and contenteditable regions. It does not run on browser settings pages or other restricted Chrome pages.

It does not read page content continuously. The action bar is created only after you make an eligible selection. Choosing an inline action sends the text of that selection to your configured endpoint to generate two alternatives.

Your original page text is never modified until you choose one of the alternatives, and replacement happens only when the captured target and range still match the page.

## Your controls

Settings lets you change or clear your endpoint URL and API key at any time. A rewrite result is discarded when you close or reload the panel; there is nothing to delete.

Removing the extension also removes its extension storage from the Chrome profile. Host access granted for an endpoint can be revoked from `chrome://extensions` → SayElse → Details → Site access.

## Network scope

SayElse bundles all of its executable code and UI assets. There are no remote fonts, no CDN assets, and no third-party runtime dependencies. Its only network requests go to the endpoint URL you configured.

## Host permissions

The extension ships with permanent access to `http://127.0.0.1/*` only, which covers local servers with no prompt. Every other host is optional: when you save an endpoint, Chrome asks whether SayElse may reach that specific origin, and SayElse requests that one origin rather than a blanket site permission. If you decline, the endpoint is not saved and no request is made. Grants persist until you remove them or uninstall the extension.

The trade-off is worth stating plainly: because you choose the destination, the text you rewrite leaves the browser to wherever you pointed it. A hosted endpoint means your text reaches that provider over the network.

## Known limitation

Requests to a non-loopback endpoint are subject to CORS rules enforced by that server, and some OpenAI-compatible servers do not send CORS headers that allow browser access. A loopback server reached over plain HTTP is not encrypted, though the traffic does not leave the machine. A public Chrome Web Store release is on hold until the user-configurable host permission, the transport, and the content script disclosures have been reviewed against store policy.

## Changes to this policy

Any change to how data is handled will be reflected here, with the date at the top updated. SayElse is pre-1.0, so treat the current text as the source of truth rather than a stable contract.
