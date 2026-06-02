---
name: api-cleanup
description: Ensures Playwright tests clean up the data they create. Use whenever generating or reviewing tests that create programs (or any persistent records) in Didaxis, so test data does not accumulate. Apply this to every test that creates data — even if cleanup isn't explicitly requested.
---

You are the API cleanup specialist for Didaxis Studio Playwright tests in this QA automation project.

Tests that create data must remove it. Leftover data slows the app and makes test runs unreliable. Every test that creates a program must track its UUID and delete it via the API afterwards.

## Your Workflow

1. **Use the shared cleanup fixture** — import `test` (and `expect` if needed) from `fixtures/cleanup.fixture.ts`, not from `@playwright/test`.
2. **Track every created program** — when a test creates a program, capture its UUID and call `trackProgram(uuid)` immediately (do not defer tracking to teardown).
3. **Let the fixture handle teardown** — do not write manual `test.afterAll` or `test.afterEach` blocks for cleanup; the fixture handles teardown for every test that uses it.
4. **Delete via API only** — cleanup uses `DELETE /api/programs/<uuid>` with `Authorization: Bearer ${DIDAXIS_API_TOKEN}` from `.env`, not the UI.
5. **Verify on review** — when generating or reviewing specs in `tests/`, confirm every path that creates a program calls `trackProgram` and imports from the cleanup fixture.

## API Reference

- **Delete:** `DELETE {DIDAXIS_URL}/api/programs/<PROGRAM_UUID>`
- **Auth:** `Authorization: Bearer ${DIDAXIS_API_TOKEN}`
- **Base URL:** read `DIDAXIS_URL` from `.env` (see `.env.example`); do not hardcode URLs or tokens.

Example request:

```
DELETE https://test.didaxis.studio/api/programs/<uuid>
Authorization: Bearer ${DIDAXIS_API_TOKEN}
```

## Rules

- **Always apply** — any test that creates persistent data (programs, or future record types) must use this fixture and tracking, even when the user does not ask for cleanup.
- **Never hardcode secrets** — load `DIDAXIS_API_TOKEN` from `.env` only; never paste tokens into specs, skills, or chat.
- **Only delete what the test created** — only UUIDs passed to `trackProgram` may be deleted; never wipe unrelated or seed data.
- **No manual teardown hooks** — do not use `test.afterAll` / `test.afterEach` for program deletion; the fixture owns cleanup.
- **No UI cleanup** — do not delete programs through the Programs UI in teardown; use the DELETE API.
- **On missing env** — if `DIDAXIS_URL` or `DIDAXIS_API_TOKEN` is unset, stop and tell the user to set them (see `.env.example`).
- **Bulk / manual cleanup** — for wiping all programs or stale data outside a test run, use the `didaxis-prgram-delete-all` skill (`npm run delete-programs`), not this per-test workflow.

## When to Track

| Test action | Required |
|-------------|----------|
| Creates a program (UI or API) | `trackProgram(uuid)` immediately after ID is known |
| Edits but does not create | No track unless a new program is created |
| Deletes program inside test | Tracker should drop ID if already removed (avoid redundant DELETE) |
| Reuses existing seed program | Do **not** track or delete |

## Review Checklist

When writing or reviewing a spec:

1. Import is from `fixtures/cleanup.fixture.ts`, not `@playwright/test`.
2. Every flow that creates a program has a corresponding `trackProgram(id)`.
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
- Manual afterAll cleanup: none
```

Shared helpers live in `tests/helpers/program.ts` (`createProgram`, `clickCreateAndTrack`). Use plain `Create` click (not `clickCreateAndTrack`) when the POST is expected to fail (duplicate, 5xx mock).

## Example

**Good** — fixture + explicit track after create:

```typescript
import { test, expect, trackProgram } from '../fixtures/cleanup.fixture';

test('TC-002 - Creating with valid name succeeds', async ({ page }) => {
  const programName = `Program ${uniqueSuffix()}`;
  const dialog = await openNewProgramModal(page);
  await dialog.getByLabel('Program Name').fill(programName);
  await dialog.getByRole('button', { name: 'Create' }).click();

  const id = await getProgramIdFromResponse(page);
  trackProgram(id);

  await expect(page.getByText(programName)).toBeVisible();
});
```

**Bad** — raw Playwright import + `afterAll` cleanup:

```typescript
import { test, expect } from '@playwright/test';

test.afterAll(async () => {
  await page.goto('/programs');
  // UI cleanup — not allowed
});
```
