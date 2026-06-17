**Title:** [IreneG] - DS-5 - Programs list shows empty state when GET /api/programs returns HTTP 500

**Type:** Bug  
**Severity:** Medium  
**Priority:** Medium  
**Linked Story:** DS-5

**Steps to Reproduce:**
1. Log in as admin at DIDAXIS_URL
2. Mock `GET **/api/programs` to return HTTP 500 with body `{ "error": "Simulated server failure" }`
3. Navigate to `/programs`
4. Observe the content below the Programs heading

**Expected Result:** No program data rows; empty-state message is NOT shown; an error indication is visible (per `features/DS-5.feature.md` negative scenario for server failure)

**Actual Result:** Empty-state card is shown — "No programs yet. Create your first program to get started." with a Create Program CTA; no error UI is visible

**Environment:**
- URL: DIDAXIS_URL (https://test.didaxis.studio)
- Browser: Chromium (Playwright)
- Account: DIDAXIS_EMAIL (admin@didaxis.studio)

**Evidence:**
- Spec: `tests/ds5-list-filter.spec.ts:231` (TC-007)
- Error context: `test-results/ds5-list-filter-DS-5-Progr-859c5-ws-an-error-state-not-empty-chromium/error-context.md`
- Triage: `Reports/analysis/ds5-tc007-triage-local.md`

**Playwright Error:**
```
expect(locator).toHaveCount(expected) failed
Locator: getByText(/no programs|create your first|get started/i)
Expected: 0
Received: 1
```

**Root cause:** Frontend treats a 5xx fetch failure like an empty list — renders the empty-state card instead of an error state.

**Suggested fix:** Check `response.ok`/status in the programs-list fetch handler; render error UI with retry on non-2xx responses. Do not weaken TC-007.

**Jira:** https://legionqaschool.atlassian.net/browse/DS-112 (linked to DS-5)

**Status:** Filed
