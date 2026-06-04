# Bug Report — TC-014 Duplicate clears Description (Duplicate of DS-18)

**Title:** [IreneG] - DS-1 - Duplicate create clears Description in New Program modal

**Type:** Bug  
**Severity:** Medium  
**Priority:** Medium  
**Status:** Duplicate — existing ticket **DS-18** (comment added 2026-06-02)

**Jira:** https://legionqaschool.atlassian.net/browse/DS-18

**Steps to Reproduce:**
1. Log in as admin at https://test.didaxis.studio/login
2. Navigate to Programs
3. Create a program with a unique name (e.g. `I.G. Duplicate Name <timestamp>`)
4. Click "+ New Program" again
5. Enter the **same** Program Name and Description `I.G. second`
6. Click **Create**

**Expected Result:** Modal stays open on duplicate error; **Program Name** and **Description** retain entered values.

**Actual Result:** Modal stays open; Program Name preserved; **Description** field is cleared (`""`).

**Environment:**
- URL: https://test.didaxis.studio
- Browser: Chromium (Playwright)
- Account: admin@didaxis.studio

**Evidence:**
- Error context: `test-results/ds1-create-program-DS-1-Cr-1be78--name-is-rejected-DS-3-AC3--chromium/error-context.md`
- Screenshot: `test-results/ds1-create-program-DS-1-Cr-1be78--name-is-rejected-DS-3-AC3--chromium/test-failed-1.png`

**Playwright Error:**
```
expect(secondDialog.getByLabel('Description')).toHaveValue('I.G. second')
Expected: "I.G. second"
Received: ""
```

**Linked Story:** DS-1, DS-3 AC3
