# Bug Report — TC-021 Double-click Save duplicate PATCH

**Title:** [IreneG] - DS-2 - Rapid double-click on Save fires duplicate PATCH requests

**Type:** Bug  
**Severity:** Medium  
**Priority:** Medium  
**Jira:** https://legionqaschool.atlassian.net/browse/DS-97 (linked to DS-2)

**Steps to Reproduce:**
1. Log in as admin at https://test.didaxis.studio/login
2. Navigate to Programs
3. Create a program
4. Click Edit (`Edit <Program Name>`)
5. Change Program Name
6. Rapidly double-click Save with PATCH throttled (~1.5s)

**Expected Result:** Exactly one PATCH request; Save disables or de-dupes second click.

**Actual Result:** Two PATCH requests fired (`patchCount = 2` via MCP verification).

**Environment:**
- URL: https://test.didaxis.studio
- Browser: Chromium (Playwright v1.60.0)
- Account: admin@didaxis.studio

**Evidence:**
- Spec: `tests/ds2-edit-program.spec.ts` — TC-021 (line 440)
- Error context: `test-results/ds2-edit-program-DS-2-Edit-9e8d1-ot-create-duplicate-updates-chromium/error-context.md`

**Playwright Error (once edit locator fixed):**
```
expect(received).toBe(expected)
Expected: 1
Received: 2
```

**Linked Story:** DS-2  
**Related:** DS-96
