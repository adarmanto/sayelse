# Support

## Before you open an issue

Most reports that turn out to be configuration problems. Check these first.

**The endpoint is wrong, or the server is not running.** SayElse talks to whatever URL you saved in Settings. Check that the server is up and that you can reach `{your endpoint}/models` directly in a browser.

**Chrome blocked the request.** The first time you save an endpoint, Chrome asks whether SayElse may reach that host. If you declined, nothing is saved. Re-save the endpoint and accept, or grant access from `chrome://extensions` → SayElse → Details → Site access.

**No model is selected.** Open Settings in the side panel and pick a model. Without one, every rewrite fails with a message telling you to choose a model.

**The API key is wrong or missing.** If your server needs a key, enter it in Settings. A rejected key surfaces as an authentication error, and a bad model surfaces as a model error. They are told apart on purpose, so read the message before changing settings.

**The extension is stale.** Reload it in `chrome://extensions` after every `pnpm build`. The unpacked build does not hot reload on its own.

**The inline bar does not appear.** It only shows for eligible selections: text inside an input, textarea, or contenteditable region, on ordinary HTTP and HTTPS pages. Password fields are excluded, and restricted Chrome pages such as settings are excluded. If the page changed the selection after you made it, the capture no longer matches and the bar stays hidden.

**Replacement did not happen.** The extension refuses to replace a selection that has drifted from what it captured. Select the text again and retry.

## Opening an issue

Include Chrome version and OS, what you did, what you expected, and what happened instead. Paste the relevant Settings values and the console output from the side panel.

Redact your API key and any text you were rewriting before you post.

## What I can and cannot help with

I read issues and pull requests, but I cannot always get to them quickly, and I do not provide support for your model server or for any model provider. Those are separate projects with their own issue trackers.

## Security problems

Do not post those in a public issue. See [SECURITY.md](SECURITY.md).

## Contributing instead

If you can fix something yourself, pull requests are very welcome. [CONTRIBUTING.md](CONTRIBUTING.md) covers the setup and what a reviewable change looks like.
