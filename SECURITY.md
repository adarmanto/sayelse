# Security Policy

## Supported versions

SayElse is pre-1.0. There is no stable release channel yet, so the only supported code is the default branch. Fixes land there and you install from source or as an unpacked build.

## Reporting a vulnerability

Please do not open a public issue for a security problem. That includes a plain public issue, a public pull request, and a discussion in the repository.

Instead, use GitHub's private reporting:

- Go to the Security tab of the repository
- Click **Report a vulnerability**
- Describe the issue

If private reporting is unavailable, contact the maintainer directly at **agung.darmantoo@gmail.com**.

## What to include

- Chrome version and operating system
- SayElse version, or the commit you built from
- Steps to reproduce, and what the impact is
- Whether any text or credential is involved, so the maintainer can judge urgency

## What to expect

- An acknowledgement within a few days
- A decision on whether the report is in scope, and a rough timeline
- A fix released through the default branch, with credit unless you ask otherwise

## Handling secrets

The extension stores the API key for your configured endpoint in Chrome's local extension storage. That is persistent browser-profile storage, not an encrypted credential vault. Treat it accordingly:

- Do not commit tokens, keys, or `.env` files. `.gitignore` already covers the usual names.
- If you ever commit a key by accident, rotate it with the provider immediately. Removing the commit alone does not help, since the history still contains it.
- When sharing diagnostics, redact the API key and the text you were rewriting.

## Scope

Reports are in scope for the extension's own code: selection capture and replacement, storage handling, message passing between the content script, service worker, and side panel, the network client and the host-permission flow, and prompt construction.

Reports are out of scope for your configured endpoint and for any model provider behind it, since those are separate projects. If the vulnerability lives there, please report it there. Likewise, a finding that depends on a page deliberately abusing the extension is usually a design limitation rather than a vulnerability, though we are open to hearing it.
