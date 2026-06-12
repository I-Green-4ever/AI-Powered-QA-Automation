# Playwright CI Run Analysis

**Generated:** 2026-06-07  
**CI Run:** [#27079985679](https://github.com/I-Green-4ever/AI-Powered-QA-Automation/actions/runs/27079985679)  
**Commit:** `make super pipeline red`  
**Branch:** `master`  
**Duration:** ~9.4 min  
**Environment:** dev1 (Chromium, CI)

## Run Summary

| Metric | Value |
|--------|-------|
| Total tests | 104 |
| Passed | 76 |
| Failed | 15 |
| Skipped | 13 |
| Result | **Failure** |

**Playwright report artifact:** `playwright-report-27079985679/` (downloaded from CI)

Open locally:

```bash
npx playwright show-report playwright-report-27079985679
```

---

## Error Classification

Failures are grouped into four categories: test code errors, test assertion/locator issues, application bugs, and test infrastructure/mocking issues.

---

### 1. Test Code Errors (1 failure)

These are defects in the test suite itself — typos, invalid Playwright API usage, or broken assertions.

| Test | Spec | Error | Root Cause |
|------|------|-------|------------|
| **TC-005** — Description is optional — program creates with name only | `ds1-create-program.spec.ts:97` | `TypeError: Cannot read properties of undefined (reading 'toBeVisible')` | Intentional typo: `.not.not.toBeVisible()` instead of `.toBeVisible()` |

**Failing line:**

```ts
// tests/ds1-create-program.spec.ts:111
await expect(programs.row(programName)).not.not.toBeVisible();
```

**Verdict:** Test bug, not an application defect. Aligns with commit message "make super pipeline red."

---

### 2. Test Assertion / Locator Issues (4 failures)

These fail because assertions are too broad or poorly scoped — not because the app clearly violated acceptance criteria.

| Test | Spec | Error | Issue |
|------|------|-------|-------|
| **TC-005** — Whitespace-only name (3 spaces) is rejected | `ds3-validation.spec.ts:102` | `exactText('   ')` Expected 0, **Received 79** | `page.getByText('   ', { exact: true })` matches many unrelated whitespace nodes across the page |
| **TC-007** — Tabs/newlines/NBSP whitespace treated as empty | `ds3-validation.spec.ts:138` | `exactText('\t \u00A0\n')` Expected 0, **Received 80** | Same overly broad page-wide locator |
| **TC-007** — Whitespace-only Program Name is treated as empty | `ds1-create-program.spec.ts:131` | `Edit    ` buttons Expected 0, **Received 6** | May be environment pollution or needs table-scoped locator; create-button-disabled check likely passed |
| **TC-010** — Whitespace-only Program Name is treated as empty | `ds2-edit-program.spec.ts:202` | `exactText('   ')` Expected 0, **Received 86** | Same locator problem as DS-3 |

**Fix direction:** Scope assertions to the programs table/row (e.g. `programs.table.getByText(...)`) instead of page-wide `getByText` via `ProgramsPage.exactText()`.

---

### 3. Application Bugs (7 failures)

These indicate real product defects against acceptance criteria.

| Test | Story | Spec | Error | Likely Defect |
|------|-------|------|-------|---------------|
| **TC-003** — Internal whitespace preserved; only edges trimmed | DS-3 | `ds3-validation.spec.ts:68` | Padded name `'   I.G. Trim...   '` Expected 0, Received 1 | Edge whitespace **not trimmed** on save |
| **TC-012** — Error copy for duplicate is human-readable and field-scoped | DS-3 | `ds3-validation.spec.ts:224` | Duplicate error alert **not found** | **No user-visible duplicate-name error** in modal |
| **TC-013** — After duplicate error, fixing name and re-clicking Create succeeds | DS-3 | `ds3-validation.spec.ts:245` | 30s timeout on Create click / `waitForResponse` | **Recovery after duplicate error blocked** (likely downstream of TC-012) |
| **TC-016** — Rapid double-click on Create does not create duplicate programs | DS-1 | `ds1-create-program.spec.ts:292` | Program row Expected 1, **Received 2** | **Double-click Create creates duplicates** |
| **TC-021** — Rapid double-click on Save does not create duplicate updates | DS-2 | `ds2-edit-program.spec.ts:389` | `patchCount` Expected 1, **Received 2** | **Double-click Save sends duplicate PATCH** |
| **TC-019** — Rapid double-activation of delete does not produce duplicate dialogs/requests | DS-4 | `ds4-delete-program.spec.ts:319` | Delete request count Expected 1, **Received 2** | **Rapid double-delete fires duplicate requests** |
| **TC-007** — Server failure (5xx) shows error state, not empty | DS-5 | `ds5-list-filter.spec.ts:230` | Empty-state text visible when API returns **500** | **5xx shows empty state instead of error state** |

**DS-5 TC-007 evidence:** Page snapshot shows "No programs yet. Create your first program to get started." even though `GET /api/programs` was mocked to return HTTP 500.

---

### 4. Test Infrastructure / Mocking Issues (3 failures)

These use `page.route()` mocks; failures suggest route interception or timing problems rather than confirmed app bugs.

| Test | Spec | Error | Likely Cause |
|------|------|-------|--------------|
| **TC-004** — Empty state shows "no programs yet" message and create prompt | `ds5-list-filter.spec.ts:93` | `Programs` heading **not found** | Mocked empty-list route may not apply before navigation, or page did not load |
| **TC-005** — Deleting the last program triggers empty state | `ds5-list-filter.spec.ts:124` | Mocked program row **not visible** | `**/api/programs**` route may not match actual API URL/path |
| **TC-006** — Creating first program from empty state replaces empty state with list | `ds5-list-filter.spec.ts:168` | Timeout clicking `newProgramButtonAlt` | Empty-state CTA not reachable under mocked conditions |

---

## Breakdown by Story

| Story | Failed | Test Errors | Locator Issues | App Bugs | Infra/Mocking |
|-------|--------|-------------|----------------|----------|---------------|
| **DS-1** | 3 | 1 | 1 | 1 | 0 |
| **DS-2** | 2 | 0 | 1 | 1 | 0 |
| **DS-3** | 5 | 0 | 2 | 3 | 0 |
| **DS-4** | 1 | 0 | 0 | 1 | 0 |
| **DS-5** | 4 | 0 | 0 | 1 | 3 |

---

## Full Failure List (15 tests)

1. `ds1-create-program.spec.ts` — DS-1 TC-005 — Description is optional — program creates with name only
2. `ds1-create-program.spec.ts` — DS-1 TC-007 — Whitespace-only Program Name is treated as empty
3. `ds1-create-program.spec.ts` — DS-1 TC-016 — Rapid double-click on Create does not create duplicate programs
4. `ds2-edit-program.spec.ts` — DS-2 TC-010 — Whitespace-only Program Name is treated as empty
5. `ds2-edit-program.spec.ts` — DS-2 TC-021 — Rapid double-click on Save does not create duplicate updates
6. `ds3-validation.spec.ts` — DS-3 TC-003 — Internal whitespace is preserved; only edges are trimmed
7. `ds3-validation.spec.ts` — DS-3 TC-005 — Whitespace-only name (3 spaces) is rejected — form not submitted
8. `ds3-validation.spec.ts` — DS-3 TC-007 — Tabs/newlines/NBSP whitespace are treated as empty
9. `ds3-validation.spec.ts` — DS-3 TC-012 — Error copy for duplicate is human-readable and field-scoped
10. `ds3-validation.spec.ts` — DS-3 TC-013 — After duplicate error, fixing name and re-clicking Create succeeds
11. `ds4-delete-program.spec.ts` — DS-4 TC-019 — Rapid double-activation of delete does not produce duplicate dialogs/requests
12. `ds5-list-filter.spec.ts` — DS-5 TC-004 — Empty state shows "no programs yet" message and create prompt
13. `ds5-list-filter.spec.ts` — DS-5 TC-005 — Deleting the last program triggers the empty state
14. `ds5-list-filter.spec.ts` — DS-5 TC-006 — Creating first program from empty state replaces empty state with list
15. `ds5-list-filter.spec.ts` — DS-5 TC-007 — Server failure (5xx) shows error state, not empty

---

## Priority Recommendations

1. **Fix the intentional test typo** in DS-1 TC-005 — change `.not.not.toBeVisible()` to `.toBeVisible()` on line 111 of `tests/ds1-create-program.spec.ts`.

2. **File application bugs** for idempotency failures:
   - DS-1 TC-016 — double-click Create creates duplicate programs
   - DS-2 TC-021 — double-click Save sends duplicate PATCH requests
   - DS-4 TC-019 — rapid double-delete fires duplicate requests

3. **File application bugs** for validation and error UX:
   - DS-3 TC-003 — edge whitespace not trimmed on save
   - DS-3 TC-012 — no user-visible duplicate-name error in modal
   - DS-3 TC-013 — recovery after duplicate error blocked (likely downstream of TC-012)

4. **File application bug** for error handling:
   - DS-5 TC-007 — 5xx API response shows empty state instead of error state

5. **Tighten test locators** for whitespace assertions — scope `ProgramsPage.exactText()` to the programs table/row instead of the full page to avoid false positives (DS-1 TC-007, DS-2 TC-010, DS-3 TC-005, DS-3 TC-007).

6. **Review DS-5 route mocks** — verify `page.route()` patterns match the actual API URL/path and apply before navigation (DS-5 TC-004, TC-005, TC-006).

---

## Related Artifacts

| Artifact | Path |
|----------|------|
| Playwright HTML report | `playwright-report-27079985679/index.html` |
| CI run logs | `gh run view 27079985679 --log-failed` |
| Existing bug drafts | `Block6/bugs/` |
