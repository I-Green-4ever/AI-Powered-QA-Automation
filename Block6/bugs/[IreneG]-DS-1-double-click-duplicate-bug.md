# Bug Report Draft — TC-016 (Duplicate of DS-92)

**Title:** [IreneG] - DS-1 - Rapid double-click on Create creates duplicate programs

**Type:** Bug  
**Severity:** Medium  
**Priority:** Medium  
**Status:** Duplicate — commented on existing ticket **DS-92** (reconfirmed 2026-06-02; also related: DS-79)

**Jira:** https://legionqaschool.atlassian.net/browse/DS-92

**Steps to Reproduce:**
1. Log in as admin at https://test.didaxis.studio/login
2. Navigate to Programs (`/programs`)
3. Click "+ New Program"
4. Fill Program Name (e.g. `I.G. DoubleClick 26/May/2026 [18:32:30]`)
5. Fill Description with `I.G. double click guard`
6. Rapidly double-click the Create button (test delays POST `/api/programs` by 1.5s to simulate slow network)

**Expected Result:** Exactly one program row appears in the list. Create button disables after first click or submission is idempotent.

**Actual Result:** Two identical program rows are created from a single double-click submission.

**Environment:**
- URL: https://test.didaxis.studio
- Browser: Chromium (Playwright v1.60.0)
- Account: admin@didaxis.studio

**Evidence:**
- Spec: `tests/ds1-create-program.spec.ts` — TC-016 (line 313)
- Error context: `test-results/ds1-create-program-DS-1-Cr-73f7d-t-create-duplicate-programs-chromium/error-context.md`

**Playwright Error:**
```
Error: expect(locator).toHaveCount(expected) failed
Locator:  getByRole('row', { name: 'I.G. DoubleClick 26/May/2026 [18:32:30]' })
Expected: 1
Received: 2
Timeout:  5000ms
```

**Linked Story:** DS-1  
**Jira Action:** Comment added to https://legionqaschool.atlassian.net/browse/DS-92
