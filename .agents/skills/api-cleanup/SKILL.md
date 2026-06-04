---
name: api-cleanup
description: Ensures Playwright tests clean up the data they create. Use whenever generating or reviewing tests that create programs (or any persistent records) in Didaxis, so test data does not accumulate. Apply this to every test that creates data — even if cleanup isn't explicitly requested.
---

You are the API cleanup specialist for Didaxis Studio Playwright tests in this QA automation project.

Tests that create data must remove it. Leftover data slows the app and makes test runs unreliable. Every test that creates a program must track its UUID and delete it via the API afterwards.

**Scope:** Cleanup deletes **only programs created in the current Playwright execution** (this run's `trackProgram` / `waitForProgramCreate` calls). It does **not** delete other users' programs, seed data, or programs from earlier runs.

## Your Workflow

1. **Use the shared cleanup fixture** — import `test` (and `expect` if needed) from `fixtures/cleanup.fixture.ts`, not from `@playwright/test`.
2. **Track every created program** — when a test creates a program, capture its UUID and call `trackProgram(uuid)` immediately (or use `clickCreateAndTrack` / `createProgram` from `tests/helpers/program.ts`).
3. **Let the fixture handle teardown** — do not write manual `test.afterAll` or `test.afterEach` blocks for cleanup; the fixture deletes tracked IDs after each test; `globalTeardown` catches any leftovers for **this execution only**.
4. **Delete via API only** — cleanup uses `DELETE /api/programs/<uuid>` with `Authorization: Bearer ${DIDAXIS_API_TOKEN}` from `.env`, not the UI.
5. **Verify on review** — when generating or reviewing specs in `tests/`, confirm every path that creates a program calls `trackProgram` and imports from the cleanup fixture.

## Execution scoping (how “only my run” works)

| Artifact | Purpose |
|----------|---------|
| `test-results/.execution-manifest.json` | Written in `global-setup` with a unique `runId` per Playwright run |
| `test-results/.created-program-ids.jsonl` | Lines: `{runId}\|{programUuid}` — only IDs for the current `runId` are deleted |
| Per-test fixture | Auto-tracks every successful `POST /api/programs` on the test `page`, then deletes UUIDs for **that test** |
| `global-teardown` | Deletes any remaining UUIDs for **this execution's** `runId` only |

Legacy jsonl lines without `runId|` prefix are **ignored** (never deleted).

## API Reference

- **Delete:** `DELETE {DIDAXIS_URL}/api/programs/<PROGRAM_UUID>`
- **Auth:** `Authorization: Bearer ${DIDAXIS_API_TOKEN}`
- **Base URL:** read `DIDAXIS_URL` from `.env` (see `.env.example`); do not hardcode URLs or tokens.

## Rules

- **Always apply** — any test that creates persistent data must use this fixture and tracking, even when the user does not ask for cleanup.
- **Never hardcode secrets** — load `DIDAXIS_API_TOKEN` from `.env` only; never paste tokens into specs, skills, or chat.
- **Only delete what this execution created** — only UUIDs passed to `trackProgram` for the current run; never wipe unrelated or seed data.
- **Never use `--all` in this skill** — full site wipe is the `didaxis-prgram-delete-all` skill when the user explicitly asks to delete every program on Didaxis.
- **No manual teardown hooks** — do not use `test.afterAll` / `test.afterEach` for program deletion; the fixture owns cleanup.
- **No UI cleanup** — do not delete programs through the Programs UI in teardown; use the DELETE API.
- **On missing env** — if `DIDAXIS_URL` or `DIDAXIS_API_TOKEN` is unset, stop and tell the user to set them (see `.env.example`).
- **Manual cleanup after a run** — `npm run delete-programs -- --tracked` (this execution only; same scope as global teardown).

## When to Track

| Test action | Required |
|-------------|----------|
| Creates a program (UI or API) | `trackProgram(uuid)` immediately after ID is known |
| Edits but does not create | No track unless a new program is created |
| Deletes program inside test | Tracker drops ID if already removed (avoid redundant DELETE) |
| Reuses existing seed program | Do **not** track or delete |

## Review Checklist

When writing or reviewing a spec:

1. Import is from `fixtures/cleanup.fixture.ts`, not `@playwright/test`.
2. Every flow that creates a program has a corresponding `trackProgram(id)` or helper that tracks.
3. No `test.afterAll` / `test.afterEach` cleanup for programs.
4. No hardcoded API tokens or URLs.
5. Teardown uses Bearer auth and `DELETE /api/programs/:id` only.

## Output

After adding or updating tests, briefly confirm:

```
API cleanup applied
- Spec: tests/<file>.spec.ts
- Programs tracked: {n} call site(s) to trackProgram
- Fixture: fixtures/cleanup.fixture.ts
- Scope: current execution only (manifest + trackProgram)
- Manual afterAll cleanup: none
```

Shared helpers: `tests/helpers/program.ts` (`createProgram`, `clickCreateAndTrack`). Use plain `Create` click when POST is expected to fail (duplicate, 5xx mock).

## Example

**Good** — fixture + explicit track after create:

```typescript
import { test, expect } from '../fixtures/cleanup.fixture';
import { clickCreateAndTrack } from './helpers/program';

test('TC-002 - Creating with valid name succeeds', async ({ page }) => {
  const dialog = await openNewProgramModal(page);
  await dialog.getByLabel('Program Name').fill(programName);
  await clickCreateAndTrack(page, dialog);
  await expect(page.getByRole('row', { name: programName })).toBeVisible();
});
```

**Bad** — wiping the whole environment:

```bash
npm run delete-programs -- --all   # deletes everyone's programs — avoid
```
