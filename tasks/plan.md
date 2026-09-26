# Implementation Plan: Support any OpenAI-compatible endpoint

## Overview

SayElse currently hardcodes a single endpoint — `http://127.0.0.1:20128/v1` in `src/lib/constants.ts` — and brands the 9Router name through 14+ user-facing strings. The wire protocol it already speaks (`GET /v1/models`, `POST /v1/chat/completions`, SSE `choices[0].delta.content` terminated by `data: [DONE]`) *is* the OpenAI standard, so no protocol work is needed. What changes is where the base URL and credentials come from, the MV3 permission that gates non-loopback hosts, and the copy that names a specific product.

After this change the user types their own endpoint URL and API key in Settings, Chrome grants access to exactly that host, and the extension works against any OpenAI-compatible server.

## Assumptions

1. **User-facing terminology is "API key"**, not "token", per explicit request. The persisted field is renamed `token` → `apiKey` in the same migration that adds `baseUrl`, so there is one migration pass, not two.
2. **No preset dropdown.** The user types the endpoint URL themselves; the UI carries clear help text describing the expected shape (`https://api.example.com/v1`) plus a few concrete examples.
3. **Streams without `[DONE]` are still treated as success** (current behaviour preserved). Some honest OpenAI-compatible servers simply close the connection. Partial output is accepted rather than erroring.
4. **The user must grant host access deliberately**, via an explicit "Save & grant access" action, because `chrome.permissions.request()` only works inside a user gesture and requesting on every keystroke would be both broken and hostile.

## Architecture Decisions

**The wire protocol is already correct; only the configuration source changes.** `sse.ts` is entirely provider-agnostic and needs no modification. `src/lib/api/nineRouter.ts` becomes `src/lib/api/openaiCompatible.ts` — the current filename is actively misleading once 9Router is not the only target.

**`EndpointConfig { baseUrl, apiKey }` becomes the single input to the client.** Today the two entry points disagree: `streamChat` takes an options object while `listModels(token, signal)` takes positional args, and both silently read a module-level constant. Normalising to one shared interface removes the class of bug where a caller forgets to thread configuration.

**Settings migrate in place under the existing storage key.** The `version: 1` field *inside* the payload is the real migration marker; `SETTINGS_STORAGE_KEY` stays `'sayelse.settings.v1'` on purpose. Changing the key would orphan every existing user's data and silently reset them to defaults — the exact failure mode this task is most exposed to.

**Base URL is normalised, never guessed.** A helper trims whitespace, adds `https://` when no scheme is present, strips trailing slashes, and tolerates a pasted full `.../chat/completions` URL. It deliberately does *not* auto-append `/v1`: some servers expose `/api/v1` or no version segment, and silently rewriting the path would be worse than a clear error. Invalid input is rejected at save time with a specific message.

**Permissions stay host-scoped via `optional_host_permissions`.** Declaring `<all_urls>` would make the extension trivially reviewable as a text-exfiltration vector on the Chrome Web Store — a rewrite tool with all-sites access that posts text to arbitrary hosts is the highest-risk permission combination in the store. Requesting one host at a time is both more defensible and more honest about what the extension touches.

**Provider identity is derived, not configured.** Error messages interpolate a label from the endpoint host (`api.openai.com`, `127.0.0.1:20128`) rather than naming a product. There is no provider registry; the endpoint *is* the identity.

**Loopback stays pre-granted.** `127.0.0.1` remains in `host_permissions`, and the permission helper detects loopback origins and skips the request entirely — the original local-only setup keeps working with no prompt.

## Task List

### Phase 1: Foundation — data model and pure helpers

- [ ] **Task 1**: Introduce settings v2 with an in-place migration
- [ ] **Task 2**: Add base URL normalisation and endpoint helpers
- [ ] **Checkpoint: Foundation** — tests pass, typecheck clean, no user-visible change yet

### Phase 2: API client and call sites

- [ ] **Task 3**: Generalise the API client to take an `EndpointConfig`
- [ ] **Task 4**: Thread `baseUrl` and `apiKey` through all call sites
- [ ] **Checkpoint: Core** — a configured non-9router endpoint works end to end in code

### Phase 3: Permissions and settings UI

- [ ] **Task 5**: Declare optional host permissions and add the grant helper
- [ ] **Task 6**: Add the endpoint URL field with an explicit grant action
- [ ] **Checkpoint: UX** — full manual flow verified in a real browser

### Phase 4: Copy and documentation

- [ ] **Task 7**: Remove 9Router branding from all user-facing copy
- [ ] **Task 8**: Update documentation and the package description
- [ ] **Checkpoint: Complete** — definition of done

---

## Task 1: Introduce settings v2 with an in-place migration

**Description:** Add `baseUrl` and rename `token` to `apiKey` in the persisted settings shape, and migrate existing v1 payloads forward without losing anything. This is the highest-risk task in the plan and is sequenced first deliberately: `getSettings()` falls back to `getDefaultSettings()` on any parse failure, so a naive schema change would silently wipe every existing user's API key, selected model, and recipe.

**Acceptance criteria:**
- [ ] `settingsSchema` validates the v2 shape: `version: 2`, `baseUrl`, `apiKey`, `selectedModel`, `defaults`, `theme`
- [ ] A v1 payload read through `getSettings()` returns v2 with `apiKey` taken from `token`, `baseUrl` set to the default endpoint, and every other field preserved byte-for-byte
- [ ] The migrated result is written back to storage so the upgrade happens once, not on every read
- [ ] A malformed payload still yields defaults (existing test keeps passing)

**Verification:**
- [ ] Tests pass: `pnpm test src/lib/storage`
- [ ] Typecheck: `pnpm typecheck`
- [ ] Manual check: seed `storage.local` with a real v1 object, reload the side panel, confirm the API key, model, and recipe survive and the version reads 2

**Dependencies:** None

**Files likely touched:**
- `src/lib/constants.ts` — `DEFAULT_BASE_URL` (replacing `ROUTER_BASE_URL`), v2 `DEFAULT_SETTINGS`
- `src/lib/storage/schema.ts` — v2 schema, `legacySettingsSchema`, `migrateSettings`
- `src/lib/storage/settings.ts` — read-through migration
- `src/lib/storage/settings.test.ts` — migration regression tests

**Estimated scope:** Medium (4 files)

**Note on the storage key:** `SETTINGS_STORAGE_KEY` deliberately stays `'sayelse.settings.v1'`. The in-payload `version` field is the migration marker; renaming the key would orphan stored data.

---

## Task 2: Add base URL normalisation and endpoint helpers

**Description:** Pure, dependency-free functions for turning user input into a usable endpoint: a `normaliseBaseUrl` that accepts sloppy paste and returns a validated absolute URL, an `originPatternFromBaseUrl` that yields the MV3 origin pattern for the permission request, and a `providerLabel` that yields a short human-readable host for error copy. No network, no storage — these are trivially testable and everything in Phases 2 and 3 depends on them.

**Acceptance criteria:**
- [ ] `normaliseBaseUrl` accepts a bare host, adds `https://` when no scheme is present, and strips trailing slashes
- [ ] A pasted URL ending in `/chat/completions` or `/models` is reduced to its base
- [ ] Invalid input (empty, malformed, non-http scheme) returns a discriminated failure rather than a silently broken URL
- [ ] `providerLabel` returns the host (with port when present) and a sensible fallback when the URL will not parse
- [ ] `originPatternFromBaseUrl` returns `https://host/*` and reports loopback origins distinctly so the caller can skip the permission request

**Verification:**
- [ ] Tests pass: `pnpm test src/lib/api`
- [ ] Typecheck: `pnpm typecheck`
- [ ] Manual check: none needed — pure functions, fully covered by tests

**Dependencies:** None

**Files likely touched:**
- `src/lib/api/endpoint.ts` (new)
- `src/lib/api/endpoint.test.ts` (new)

**Estimated scope:** Small (2 files, both new)

---

## Task 3: Generalise the API client to take an `EndpointConfig`

**Description:** Rewrite `src/lib/api/nineRouter.ts` as `src/lib/api/openaiCompatible.ts` so the base URL and API key arrive as arguments rather than being read from a module constant. Rename `RouterError` to `ApiError` (its `code` union is already provider-neutral, so `describeGenerationError` needs no change). Route every user-facing message through `providerLabel` instead of the hardcoded "9Router" string. Also drop the `n` option — nothing passes it, only `choices[0]` is ever read, and it falsely advertises multi-candidate support that does not exist.

**Acceptance criteria:**
- [ ] No module-level endpoint constant is imported; `listModels` and `streamChat` both take `{ baseUrl, apiKey }`
- [ ] `listModels` takes a single options object, matching `streamChat`, and calls the supplied `signal`
- [ ] `RouterError` is renamed `ApiError` with no change to its `code` union or `status` field
- [ ] Every error message interpolates the provider label and no file in `src/` contains the string "9Router"
- [ ] Error messages still never embed response body content (existing security assertion holds)
- [ ] The `n` option is removed from the request body and from the options type

**Verification:**
- [ ] Tests pass: `pnpm test`
- [ ] Typecheck: `pnpm typecheck`
- [ ] Manual check: n/a at this task — call sites are still on the old signature and will not compile until Task 4

**Dependencies:** Task 2 (needs `providerLabel`)

**Files likely touched:**
- `src/lib/api/nineRouter.ts` → `src/lib/api/openaiCompatible.ts`
- `src/lib/api/nineRouter.test.ts` → `src/lib/api/openaiCompatible.test.ts`
- `src/lib/generation.ts` — re-export `ApiError`, accept `EndpointConfig`

**Estimated scope:** Medium (3 files)

**Test gap to close here:** the existing tests never assert the request URL or headers. Add assertions that the URL is built from the supplied `baseUrl` and that `Authorization: Bearer <apiKey>` is present only when a key is given.

---

## Task 4: Thread `baseUrl` and `apiKey` through all call sites

**Description:** Update the three consumers — the side panel (`App.tsx`), the background service worker, and `generation.ts` — to read the endpoint from settings and pass it down. `refreshModels` currently takes a bare `token` and reads `settings.token` from a stale closure; it should take the whole `EndpointConfig`. The base URL is also the trigger for re-running model discovery: when the user changes the endpoint, the previously fetched model list is meaningless.

**Acceptance criteria:**
- [ ] Side-panel generation, inline rewrite in the background worker, and model discovery all pass the same `{ baseUrl, apiKey }` derived from current settings
- [ ] Changing `baseUrl` in settings re-runs model discovery and clears a model selection that the new endpoint does not offer
- [ ] `ROUTER_BASE_URL` is deleted from `src/lib/constants.ts`; no module imports it
- [ ] The `generate` callback dependency array includes everything it reads, so a changed API key takes effect without a panel remount

**Verification:**
- [ ] Tests pass: `pnpm test`
- [ ] Typecheck: `pnpm typecheck`
- [ ] Manual check: side panel generates against the configured endpoint; right-click inline rewrite also uses it

**Dependencies:** Tasks 1, 3

**Files likely touched:**
- `src/entrypoints/sidepanel/App.tsx`
- `src/entrypoints/background.ts`
- `src/lib/generation.ts`
- `src/lib/constants.ts`

**Estimated scope:** Medium (4 files)

---

## Task 5: Declare optional host permissions and add the grant helper

**Description:** Widen the manifest so a user-chosen host can be granted at runtime, and wrap the request in a helper that skips loopback (already pre-granted) and reports a clear result the UI can render. The grant is a one-time user decision, but the endpoint can be edited later, so the helper also answers "do I already have access to this host?"

**Acceptance criteria:**
- [ ] `wxt.config.ts` keeps `host_permissions: ['http://127.0.0.1/*']` and adds `optional_host_permissions` covering `http` and `https`
- [ ] A helper requests access for exactly the origin of the configured base URL and reports granted / denied
- [ ] Loopback origins resolve as already-granted without prompting
- [ ] The helper is a thin wrapper over `browser.permissions` and is unit-testable against an injected stub

**Verification:**
- [ ] Tests pass: `pnpm test`
- [ ] Typecheck: `pnpm typecheck`
- [ ] Manual check: build the extension, load unpacked, confirm `optional_host_permissions` appears in the generated manifest

**Dependencies:** Task 2 (needs `originPatternFromBaseUrl`)

**Files likely touched:**
- `wxt.config.ts`
- `src/lib/browser/permissions.ts` (new)
- `src/lib/browser/permissions.test.ts` (new)

**Estimated scope:** Small (2 new files, 1 config line)

---

## Task 6: Add the endpoint URL field with an explicit grant action

**Description:** Add a base URL input above the API key field in the connection settings group, with help text stating the expected shape and a few concrete examples (a hosted API and a local one). Because `chrome.permissions.request()` requires a user gesture, the field keeps local draft state and commits on an explicit action that validates the URL, requests access, saves, and refreshes models. Reuse the existing `settings-group` / `field-label` / `secondary-button` markup so the new field matches its neighbours.

**Acceptance criteria:**
- [ ] An "Endpoint URL" field with help text naming the expected format and showing example values sits above the API key field
- [ ] Draft edits are not persisted on every keystroke; they commit on an explicit action
- [ ] The action rejects a malformed URL inline with a specific message and does not request permission
- [ ] On success the endpoint is saved and the model list is refreshed; a denied permission is reported plainly without discarding what the user typed
- [ ] Loopback endpoints save and refresh without showing a permission prompt
- [ ] The field is labelled "API key" and its placeholder no longer names a specific product

**Verification:**
- [ ] Tests pass: `pnpm test`
- [ ] Typecheck: `pnpm typecheck`
- [ ] Manual check: in a loaded build, enter a remote endpoint, grant access, confirm models load; reload and confirm the endpoint and permission both persist

**Dependencies:** Tasks 1, 4, 5

**Files likely touched:**
- `src/entrypoints/sidepanel/components/SettingsView.tsx`
- `src/entrypoints/sidepanel/App.tsx`
- `src/entrypoints/sidepanel/styles.css`

**Estimated scope:** Medium (3 files)

---

## Task 7: Remove 9Router branding from all user-facing copy

**Description:** Sweep the remaining product-specific strings now that the endpoint is user-chosen: the connection status chip, the privacy card, the empty-state hint, and the two "choose a model in Settings" errors. Replace them with endpoint-derived or neutral wording. Keep these in plain, non-jargon language per the project's existing tone.

**Acceptance criteria:**
- [ ] The status chip reads as a generic connection state rather than naming a router product
- [ ] The privacy card describes the user-configured endpoint instead of a fixed local one, and no longer implies traffic stays on the machine
- [ ] Both "choose a model" errors reference Settings generically
- [ ] `grep -ri "9router" src/` returns nothing

**Verification:**
- [ ] Tests pass: `pnpm test`
- [ ] Typecheck: `pnpm typecheck`
- [ ] Manual check: read the settings view and the offline state in the loaded extension; every string should make sense with no product configured at all

**Dependencies:** Task 3

**Files likely touched:**
- `src/entrypoints/sidepanel/components/ConnectionState.tsx`
- `src/entrypoints/sidepanel/components/OutputPanel.tsx`
- `src/entrypoints/sidepanel/components/SettingsView.tsx`
- `src/entrypoints/sidepanel/App.tsx`
- `src/entrypoints/background.ts`

**Estimated scope:** Small (5 files, one string each)

---

## Task 8: Update documentation and the package description

**Description:** Bring the prose in line with the new behaviour. The privacy policy is the sensitive one: it currently justifies a narrow loopback permission and states that nothing leaves the machine, and both claims become false once a user can point the extension at a third-party host. Treat that document as a policy statement needing human review rather than a mechanical edit.

**Acceptance criteria:**
- [ ] `README.md` documents configuring any OpenAI-compatible endpoint, with the `/v1` expectation stated explicitly
- [ ] `PRIVACY.md` accurately describes a user-configurable endpoint, the permission grant, and where text is sent — **flagged for human review before release**
- [ ] `SECURITY.md`, `SUPPORT.md`, and `CONTRIBUTING.md` no longer describe a fixed endpoint
- [ ] `package.json` description and a `CHANGELOG.md` entry reflect the new capability

**Verification:**
- [ ] Tests pass: `pnpm test`
- [ ] Build succeeds: `pnpm build`
- [ ] Manual check: `grep -ri "9router" *.md package.json` surfaces only intentional historical mentions in the changelog

**Dependencies:** Tasks 1–7

**Files likely touched:**
- `README.md`, `PRIVACY.md`, `SECURITY.md`, `SUPPORT.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `package.json`

**Estimated scope:** Medium (7 files, prose only)

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Silent settings wipe.** A v1→v2 schema change fails zod parsing, and `getSettings()` returns defaults — destroying every existing user's API key, model, and recipe with no error. | **High** — unrecoverable data loss for all current users | Task 1 is sequenced first and is entirely test-driven. A dedicated regression test asserts a real v1 payload survives with every field intact. Storage key stays unchanged; only the in-payload `version` moves. |
| **Permission prompt is a dead end.** If `chrome.permissions.request()` is called outside a user gesture it rejects silently, leaving the user with a saved endpoint that can never connect. | High — confusing dead-end state | The grant lives on an explicit button click (Task 6), the one context where the gesture requirement is guaranteed. A denied grant is reported plainly without discarding the input. |
| **Chrome Web Store rejection.** Text sent to an arbitrary user-supplied host is a sensitive-data-flow pattern that reviewers scrutinise. | Medium | Optional, host-scoped permissions rather than `<all_urls>`. `PRIVACY.md` updated to describe the flow accurately and reviewed by a human before release. |
| **Request body leaks to the wrong path.** A user pastes a full `.../chat/completions` URL and the client appends the path again. | Medium | `normaliseBaseUrl` strips known endpoint suffixes (Task 2) and is covered by tests. |
| **Stale model list after an endpoint change.** Models are cached in component state; switching hosts leaves an unrelated list in the dropdown. | Medium | Task 4 makes `baseUrl` a trigger for re-running discovery and drops a selection the new endpoint does not offer. |
| **Partial output reads as complete.** A server that omits `[DONE]` returns truncated text that looks finished. | Low — accepted by explicit decision | Preserved current behaviour per requirement. A truncation indicator was considered and deferred; noted here so the tradeoff stays on record. |

## Out of Scope

- Adding request parameters not currently sent (`temperature`, `max_tokens`, `stop`, `stream_options`) — some OpenAI-compatible servers reject unknown fields.
- Token-usage accounting and cost metering. `streamChunkSchema` has no `usage` field and nothing consumes it today.
- True multi-candidate generation (`n > 1`) — the current client silently drops `choices[1..]`.
- Per-endpoint presets or a provider registry. The user supplies the URL; the endpoint is the identity.
- Bundling or proxying any hosted provider.

## Open Questions

- **Should the API key be moved out of `storage.local`?** It is stored unencrypted today and that stays acceptable for a local-first tool, but pointing the extension at a third-party host raises the value of what is at stake. Out of scope here; worth revisiting if a hosted default is ever added.
- **Truncation indicator.** Deferred per the explicit decision to keep `[DONE]`-less streams a success. If a user ever reports silently short output, this is the follow-up.
