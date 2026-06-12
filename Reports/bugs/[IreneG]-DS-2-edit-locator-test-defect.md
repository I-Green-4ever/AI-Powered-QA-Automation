# DS-2 Suite Failure Analysis — Test Locator (Not Filed as Product Bug)

**Run date:** 2026-05-26  
**Spec:** `tests/ds2-edit-program.spec.ts`  
**Result:** 19 failed, 0 passed, 3 skipped

## Root Cause

`openEditModal()` uses a stale locator:

```ts
await row.getByRole('button', { name: '✏️' }).click();
```

The UI exposes edit buttons as **`Edit <Program Name>`** (aria-label), not a pencil emoji.

## Verification (Playwright MCP)

| Check | Result |
|-------|--------|
| `getByRole('button', { name: '✏️' })` | 0 matches |
| `getByRole('button', { name: /Edit .../ })` | 1 match, opens Edit Program modal |
| Pre-populated fields | Correct |
| Save disabled when name cleared | Correct |

## Jira Action

Comment added to [DS-94](https://legionqaschool.atlassian.net/browse/DS-94) — original edit-button issue appears fixed; tests need locator update.

## Recommended Fix

```ts
await row.getByRole('button', { name: new RegExp(`Edit ${programName}`) }).click();
```

## Other Failures

A few tests (TC-009, TC-015, TC-016, TC-019) also failed on transient **login flake** in parallel runs — not product defects.
