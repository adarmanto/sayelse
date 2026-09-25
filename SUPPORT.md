# Support

## Before you open an issue

Most reports that turn out to be configuration problems. Check these first.

**9Router is not running, or is on another port.** SayElse only talks to `http://127.0.0.1:20128/v1`. Confirm 9Router is listening on `20128` and that you can reach `/v1/models` directly.

**No model is selected.** Open Settings in the side panel and pick a model. Without one, every rewrite fails with a message telling you to choose a model.

**The token is wrong or missing.** If your 9Router instance needs a token, enter it in Settings. A rejected token surfaces as an authentication error, and a bad model surfaces as a model error. They are told apart on purpose, so read the message before changing settings.

**The extension is stale.** Reload it in `chrome://extensions` after every `pnpm build`. The unpacked build does not hot reload on its own.

**The inline bar does not appear.** It only shows for eligible selections: text inside an input, textarea, or contenteditable region, on ordinary HTTP and HTTPS pages. Password fields are excluded, and restricted Chrome pages such as settings are excluded. If the page changed the selection after you made it, the capture no longer matches and the bar stays hidden.

**Replacement did not happen.** The extension refuses to replace a selection that has drifted from what it captured. Select the text again and retry.

## Opening an issue

Include Chrome version and OS, what you did, what you expected, and what happened instead. Paste the relevant Settings values and the console output from the side panel.

Redact your 9Router token and any text you were rewriting before you post.

## What I can and cannot help with

I read issues and pull requests, but I cannot always get to them quickly, and I do not provide support for 9Router or for any model provider. Those are separate projects with their own issue trackers.

## Security problems

Do not post those in a public issue. See [SECURITY.md](SECURITY.md).

## Contributing instead

If you can fix something yourself, pull requests are very welcome. [CONTRIBUTING.md](CONTRIBUTING.md) covers the setup and what a reviewable change looks like.
