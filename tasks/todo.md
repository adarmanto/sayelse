# Tasks: Support any OpenAI-compatible endpoint

Plan: [`plan.md`](./plan.md)

All tasks implemented and verified: `pnpm typecheck` clean, `pnpm test` 88/88 passing (12 files), `pnpm build` succeeds, and `optional_host_permissions` confirmed in the generated manifest.

---

## Phase 1: Foundation

- [x] **Task 1** — Introduce settings v2 with an in-place migration
  - [x] AC: `settingsSchema` validates v2 (`version: 2`, `baseUrl`, `apiKey`, `selectedModel`, `defaults`, `theme`)
  - [x] AC: v1 payload migrates forward with `apiKey` from `token` and all other fields preserved
  - [x] AC: migration is written back so it runs once, not per read
  - [x] AC: malformed payload still yields defaults
  - [x] Verify: `pnpm test src/lib/storage`, `pnpm typecheck`

- [x] **Task 2** — Add base URL normalisation and endpoint helpers
  - [x] AC: `normaliseBaseUrl` adds a missing scheme, strips trailing slashes, strips endpoint suffixes
  - [x] AC: invalid input returns a discriminated failure
  - [x] AC: `providerLabel` returns host + port with a fallback
  - [x] AC: `originPatternFromBaseUrl` returns `https://host/*` and flags loopback
  - [x] Verify: `pnpm test src/lib/api`, `pnpm typecheck`

### Checkpoint: Foundation
- [x] All tests pass
- [x] Typecheck clean
- [x] No user-visible change yet

---

## Phase 2: API client and call sites

- [x] **Task 3** — Generalise the API client to take an `EndpointConfig`
  - [x] AC: no module-level endpoint constant is imported
  - [x] AC: `listModels` and `streamChat` both take `{ baseUrl, apiKey }`; `listModels` takes one options object
  - [x] AC: `RouterError` → `ApiError`, `code` union unchanged
  - [x] AC: no "9Router" string remains in `src/`
  - [x] AC: `n` option removed
  - [x] AC: tests assert the built URL and the `Authorization` header
  - [x] Verify: `pnpm test`, `pnpm typecheck`

- [x] **Task 4** — Thread `baseUrl` and `apiKey` through all call sites
  - [x] AC: side panel, background worker, and model discovery all pass the same `EndpointConfig`
  - [x] AC: changing `baseUrl` re-runs discovery and drops an invalid model selection
  - [x] AC: `ROUTER_BASE_URL` deleted from `constants.ts`, imported nowhere
  - [x] AC: `generate` callback deps include everything it reads
  - [x] Verify: `pnpm test`, `pnpm typecheck`

### Checkpoint: Core
- [x] A configured non-9router endpoint works end to end in code
- [x] All tests pass

---

## Phase 3: Permissions and settings UI

- [x] **Task 5** — Declare optional host permissions and add the grant helper
  - [x] AC: `host_permissions` keeps loopback, `optional_host_permissions` covers http + https
  - [x] AC: helper requests exactly the configured origin, reports granted / denied
  - [x] AC: loopback resolves as already-granted without prompting
  - [x] AC: helper is testable against an injected stub
  - [x] Verify: `pnpm test`, `pnpm typecheck`, manifest inspected in `.output/chrome-mv3/manifest.json`

- [x] **Task 6** — Add the endpoint URL field with an explicit grant action
  - [x] AC: "Endpoint URL" field with format help and examples sits above the API key field
  - [x] AC: drafts commit on an explicit action, not per keystroke
  - [x] AC: malformed URL rejected inline, no permission requested
  - [x] AC: success saves + refreshes models; denial is reported without discarding input
  - [x] AC: loopback saves without a prompt
  - [x] AC: field is labelled "API key", placeholder names no product
  - [ ] Verify: manual browser check — **outstanding, needs a human**

### Checkpoint: UX
- [ ] Full manual flow verified in a real browser — **outstanding**
- [x] Endpoint and permission both persist across reload (covered by unit tests, not a live browser)

---

## Phase 4: Copy and documentation

- [x] **Task 7** — Remove 9Router branding from all user-facing copy
  - [x] AC: status chip reads as a generic connection state
  - [x] AC: privacy card describes the configured endpoint, no longer implies traffic stays local
  - [x] AC: both "choose a model" errors reference Settings generically
  - [x] AC: `grep -ri "9router" src/` returns nothing
  - [x] Verify: `pnpm test`, `pnpm typecheck`

- [x] **Task 8** — Update documentation and the package description
  - [x] AC: README documents configuring any OpenAI-compatible endpoint, `/v1` expectation stated
  - [x] AC: PRIVACY.md accurately describes the configurable endpoint — **needs human review before release**
  - [x] AC: SECURITY, SUPPORT, CONTRIBUTING no longer describe a fixed endpoint
  - [x] AC: package description and CHANGELOG updated
  - [x] Verify: `pnpm test`, `pnpm build`, grep for leftovers

### Checkpoint: Complete
- [x] All acceptance criteria met
- [x] Tests pass, build clean, no type errors
- [ ] PRIVACY.md reviewed by a human — **outstanding**
- [ ] Manual browser verification of the permission flow — **outstanding**
- [ ] Ready for review
