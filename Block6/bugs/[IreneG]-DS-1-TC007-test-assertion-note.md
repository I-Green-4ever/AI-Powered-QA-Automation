# TC-007 Failure Analysis — Not Filed as Product Bug

**Test:** TC-007 — Whitespace-only Program Name is treated as empty  
**Spec:** `tests/ds1-create-program.spec.ts` (line 160)

## Run Results (2026-05-26)

| Run | Outcome |
|-----|---------|
| Full suite (parallel) | Failed at **login** — transient auth flake (still on login page) |
| Isolated re-run (`--workers=1`) | Failed at line 168 assertion, **not** product behavior |

## Product Behavior (Correct)

On isolated re-run, the assertion at line 166 **passed**:
- `createBtn.toBeDisabled()` — Create stays disabled when Program Name is whitespace-only (`"   "`)

This matches AC3 / expected product behavior.

## Test Assertion Issue (Line 168)

```ts
await expect(page.getByRole('row', { name: '   ' })).toHaveCount(0);
```

**Failure:**
```
Expected: 0
Received: 16
```

`getByRole('row', { name: '   ' })` uses accessible-name substring matching and matches many existing table rows (16), not programs literally named `"   "`.

## Recommendation

Fix the test assertion, e.g.:
- Assert no row whose **exact** program name cell equals whitespace-only text
- Or filter rows created during the test session
- Do **not** use bare `getByRole('row', { name: '   ' })` on a populated programs table

**Jira Action:** None — not a product defect.
