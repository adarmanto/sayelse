# Contributing to SayElse

Thanks for taking the time. This document covers how to get set up, what a good pull request looks like, and the ground rules we all work under.

## Getting set up

You will need Chrome 114 or newer, Node.js 22 or newer, pnpm 10, and a 9Router instance running locally on port `20128`.

```bash
git clone https://github.com/<your-username>/sayelse.git
cd sayelse
pnpm install
pnpm dev
```

Load the result into `chrome://extensions` using Developer mode and Load unpacked, selecting `.output/chrome-mv3`. Reload it after each build.

Read [README.md](README.md) for how the extension works and [PRIVACY.md](PRIVACY.md) before changing anything that touches page content, storage, or network calls. Those three areas carry the most risk of leaking someone's text.

## Before you open a pull request

Run all three:

```bash
pnpm typecheck
pnpm test
pnpm build
```

All three must pass. If your change touches the inline bar, the selection handling, or the popup layout, open the built extension and click through the flow yourself. A green test suite does not tell you the popup is positioned correctly.

## Pull requests

- One concern per pull request. Splitting unrelated changes makes review faster and history readable.
- Match the surrounding code. The project uses TypeScript in strict mode, single quotes, semicolons, and 2-space indentation. No formatter is configured, so keep formatting by hand and keep it consistent with the file you are editing.
- Add tests for logic changes. Tests live next to the code they cover as `*.test.ts`. The suite runs in jsdom, so pure logic and React components are both testable without a browser.
- Update `README.md` when you add a user-facing option or change a command. Update `PRIVACY.md` when you change what gets stored or sent anywhere.
- Write commit messages in the imperative mood: `Guard replacement when the selection drifted` rather than `Fixed the replacement bug`.

## Good pull requests

Things that are easy to review:

- A bug fix that comes with a test reproducing the bug
- A new rewrite option wired through constants, prompts, and the UI together
- Refactors that leave behaviour untouched and have the suite green
- Documentation and accessibility improvements

Things worth opening a discussion first:

- Anything that adds a permission or a host permission in `wxt.config.ts`
- Anything that changes the network surface, especially moving off the fixed loopback endpoint
- Changes to selection capture or replacement, which run against pages you do not control
- Anything that touches stored data or its shape, since users may already have data in an older shape

## Reporting bugs

Open an issue and include:

- Chrome version and OS
- What you did, what you expected, and what happened instead
- The relevant Settings values, with the 9Router token redacted
- Console output from the side panel or `chrome://extensions`

Do not paste your 9Router token, any other API key, or text you were rewriting into an issue. Redact it first.

## Security issues

Do not report security problems in a public issue. Follow [SECURITY.md](SECURITY.md).

## Code of conduct

Participation is governed by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
