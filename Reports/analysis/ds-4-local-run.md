# DS-4 Local Run — Triage

**Spec:** `tests/ds4-delete-program.spec.ts`  
**Plan:** `features/DS-4.feature.md`  
**Result:** 16 passed, 2 failed, 5 skipped (44.7s)

## Summary

| Classification | Count | Tests |
|----------------|-------|-------|
| Application bug | 1 | TC-019 |
| Test issue | 1 | TC-002 |

## Per-failure diagnosis

### TC-002 — Confirming deletion removes the program (AC1)

| Field | Detail |
|-------|--------|
| **Classification** | Test issue (locator / data isolation) |
| **Root cause** | `createProgram` fails at `programs.row(name).toBeVisible()` — strict mode: **2 rows** match `Edit Test Program …` |
| **Evidence** | `tests/helpers/program.ts:34` |
| **Analysis** | Likely duplicate rows with identical name in the shared tenant (DS-3 duplicate-prevention gap) or `uniqueSuffix()` collision under `fullyParallel`. Not an AC1 delete failure — fails during precondition create. |
| **Suggested fix** | Strengthen `uniqueSuffix` (ms + worker id); scope `ProgramRow` to table body; ensure cleanup fixture runs. |

### TC-019 — Rapid double-activation of delete

| Field | Detail |
|-------|--------|
| **Classification** | Application bug |
| **Root cause** | Double-click on delete causes DOM instability / multiple dialogs; click retries until 30s timeout |
| **Evidence** | `tests/ds4-delete-program.spec.ts:340` |
| **Analysis** | Aligns with [DS-109](https://legionqaschool.atlassian.net/browse/DS-109) — app should debounce delete or ignore second activation while dialog is open |
| **Suggested fix** | App: single dialog per delete action; disable delete button while confirm is pending |

## AC coverage

| AC | Status |
|----|--------|
| AC1 — Delete with confirmation | **Covered** (TC-001, TC-002*, TC-003–004) — *TC-002 blocked by precondition |
| AC2 — Cancel deletion | **Green** (TC-005–007, TC-012) |

## Next steps

1. Human confirms → file TC-019 via `bug-reporter` (link DS-4, reference DS-109 duplicate check)
2. Delegate `test-writer` for TC-002 locator/isolation fix
3. Re-run: `npx playwright test tests/ds4-delete-program.spec.ts`
