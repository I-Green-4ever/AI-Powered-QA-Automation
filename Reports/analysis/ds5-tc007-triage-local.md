# CI Failure Triage — DS-5 TC-007 (Local Repro)

**Generated:** 2026-06-16  
**Run:** Local repro (no CI run ID supplied)  
**Spec:** `tests/ds5-list-filter.spec.ts:231`  
**Test:** TC-007 — Server failure (5xx) when loading the list shows an error state, not empty  
**Environment:** dev1 via `.env` (Chromium, Playwright)

## Summary by Story

| Story | Total Failed | Test Errors | Locator Issues | App Bugs | Infra/Mocking |
|-------|--------------|-------------|----------------|----------|---------------|
| DS-5  | 1            | 0           | 0              | 1        | 0             |

## Per-Failure Diagnosis

### TC-007 — 5xx shows error not empty (APPLICATION BUG)

| Field | Detail |
|-------|--------|
| **Affected file (test)** | `tests/ds5-list-filter.spec.ts:231-256` |
| **Affected file (app)** | Didaxis Studio Programs list — fetch/error handling (source not in this repo) |
| **Classification** | **Application bug** |
| **Root cause** | When `GET /api/programs` returns HTTP 500, the Programs page renders the same empty-state card as a successful `{ data: [] }` response. The frontend does not surface a fetch-failure / error state. |
| **Expected** | No empty-state hint (`emptyStateHint` count 0); visible error indication (`errorHint`) |
| **Actual** | Empty-state card: "No programs yet. Create your first program to get started." with "Create Program" CTA; no error text |
| **Suggested fix** | **App:** Check `response.ok` (or equivalent) in the programs-list fetch path; render a dedicated error UI with retry affordance on 5xx/network failure. Do **not** default to empty list. **Do not change the test** — assertions match Gherkin scenario in `features/DS-5.feature.md:71-77`. |
| **Evidence** | Local run 2026-06-16; TC-004 (same route mock, `{ data: [] }`) passes in same run — mock interception confirmed; page snapshot in `test-results/ds5-list-filter-DS-5-Progr-859c5-ws-an-error-state-not-empty-chromium/error-context.md` |

## Mock Interception Verification

TC-004 and TC-007 share the same `page.route('**/api/programs', …)` pattern. Running both in one invocation:

- TC-004 (200 + `{ data: [] }`) → **PASS** — empty state correctly shown
- TC-007 (500 + `{ error: … }`) → **FAIL** — identical empty-state UI shown

This rules out infra/mocking as the cause. The 500 response is reaching the app (or the app treats any non-success the same as empty).

## Jira Candidates

| Priority | Story | Test | Defect |
|----------|-------|------|--------|
| Medium | DS-5 | TC-007 | Programs list shows empty state instead of error UI when `GET /api/programs` returns HTTP 500 |

**Recommended action:** File Jira bug via `jira-bug-reporter`, linked to **DS-5**. Severity: Medium. The test is correct and should remain red until the app fix ships.

## Related Artifacts

- Error context: `test-results/ds5-list-filter-DS-5-Progr-859c5-ws-an-error-state-not-empty-chromium/error-context.md`
- POM locators: `pages/programs.page.ts` (`emptyStateHint`, `errorHint`)
- Gherkin: `features/DS-5.feature.md` lines 71-77, ambiguity note #5 (error UX inferred)
