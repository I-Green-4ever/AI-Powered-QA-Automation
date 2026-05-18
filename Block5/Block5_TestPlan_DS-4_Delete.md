# Test Plan: DS-4 — Delete program with confirmation

**Source:** [DS-4 — Delete program with confirmation](https://legionqaschool.atlassian.net/browse/DS-4) (Story, Project: Didaxis Studio, Status: In Progress)

**User story:** As an admin user, I want to delete a program I no longer need, with a confirmation step to prevent accidental deletion.

## Acceptance Criteria (from Jira DS-4)

```gherkin
Scenario: Delete program with confirmation
  Given a program "Test Program" exists
  When I click the delete icon for "Test Program"
  Then I see a confirmation dialog
  When I confirm deletion
  Then "Test Program" is removed from the program list

Scenario: Cancel program deletion
  Given I click the delete icon for a program
  When I see the confirmation dialog
  And I click Cancel
  Then the program still exists in the list
```

**AC coverage map:** AC1 (delete with confirmation) → TC-001, TC-002, TC-003, TC-004; AC2 (cancel deletion) → TC-005, TC-006, TC-007.

> **Note on test data:** all admin-created rows use the prefix `I.G.` to keep author-generated programs distinguishable from product seed data. The Jira AC literal `Test Program` is quoted verbatim where the AC is the contract under test (TC-001, TC-002).
>
> **Note on existing artifacts:** `Block4/Block2_DS-4_tplan_Delete.md` already exists with 17 TCs written against richer product knowledge (native `window.confirm`, exact dialog wording, cascade to semesters/courses), and the suite is implemented in `tests/ds4-delete-program.spec.ts`. The DS-4 Jira ACs as currently published do **not** reference any of that detail. This plan covers what DS-4's ACs guarantee and lists every product-behavior assumption from the existing implementation as an ambiguity to confirm with PM/UX.

---

## Positive flows

| TC ID | Title (expected behavior) | Preconditions | Steps | Expected result | Priority |
|-------|---------------------------|---------------|-------|-----------------|----------|
| TC-001 | Clicking delete on a program shows a confirmation dialog (AC1 verbatim) | Logged in as admin at `https://test.didaxis.studio`. On `/programs`. A program named exactly `Test Program` exists. | 1. Locate the row **Test Program**.<br>2. Click the row's **delete** control (e.g. **🗑**). | A confirmation dialog appears asking the user to confirm deletion. The program is **not** deleted at this point — no `DELETE /programs/:id` request has fired (or, if pre-fired, no row is removed from the list). | High |
| TC-002 | Confirming deletion removes the program from the list (AC1 verbatim) | Continuation of TC-001 — confirmation dialog is open for `Test Program`. | 1. In the confirmation dialog, click **OK** / confirm.<br>2. Wait for the response. | Dialog closes. Program **Test Program** is removed from the programs list **without manual refresh**. The list reflects server state (re-fetch / mutation). | High |
| TC-003 | Same flow on an admin-created I.G. row | Admin. Program `I.G. Delete Me ${timestamp}` exists (created via DS-1 TC-002 flow). | 1. Click delete on `I.G. Delete Me ${timestamp}`.<br>2. Confirm in the dialog. | Dialog closes; row disappears immediately; list re-fetches without page reload. | High |
| TC-004 | Deletion persists across navigation | Admin. Just performed TC-003. | 1. Navigate to **Dashboard**.<br>2. Navigate back to **Programs**. | Row `I.G. Delete Me ${timestamp}` does not reappear (server is source of truth). | High |
| TC-005 | Cancel via the dialog's **Cancel** button leaves the program intact (AC2 verbatim) | Admin. Program `I.G. Keep Me ${timestamp}` exists. | 1. Click delete on `I.G. Keep Me ${timestamp}`.<br>2. In the confirmation dialog, click **Cancel**. | Dialog closes. No `DELETE` request fires (or no row is removed). The row `I.G. Keep Me ${timestamp}` still exists in the list with all original data. | High |
| TC-006 | Cancel then confirm in a second attempt deletes the program | Admin. Continuation of TC-005 — `I.G. Keep Me ${timestamp}` still in the list. | 1. Click delete on the same row again.<br>2. Click **OK** / confirm. | Row is removed (per AC1). Demonstrates that cancel does not lock the row from future deletion. | Medium |
| TC-007 | Cancelling on one row does not affect other rows | Admin. Programs `I.G. Cancel Target ${timestamp}` and `I.G. Untouched ${timestamp}` exist. | 1. Click delete on `I.G. Cancel Target ${timestamp}`.<br>2. Click **Cancel** in the dialog.<br>3. Inspect the list. | Both rows still exist. The confirmation dialog never affected `I.G. Untouched ${timestamp}`. | Medium |

---

## Negative flows

| TC ID | Title (expected behavior) | Preconditions | Steps | Expected result | Priority |
|-------|---------------------------|---------------|-------|-----------------|----------|
| TC-008 | Server failure (5xx) on confirmed delete keeps the program in the list | Admin. Program `I.G. 500 Test ${timestamp}` exists. Force/mock `DELETE /programs/:id` (or equivalent) to return **500**. | 1. Click delete on `I.G. 500 Test ${timestamp}`.<br>2. Confirm in the dialog.<br>3. Wait for the failed response. | An error is shown to the user (toast/inline). The row `I.G. 500 Test ${timestamp}` **remains** in the list. No false success message. | High |
| TC-009 | Network timeout does not optimistically remove the program permanently | Admin. Program `I.G. Timeout ${timestamp}` exists. Simulate request timeout on `DELETE`. | 1. Click delete and confirm.<br>2. Wait for the timeout. | If the UI optimistically hides the row, it must reappear after timeout, **or** the UI must show a clear error. The list ultimately matches the server (which still has the row). User sees an error/timeout message. | High |
| TC-010 | Non-admin user cannot delete programs (if role-gated) | Logged in as a non-admin (e.g. `qa-viewer@school.edu`). Programs exist. | 1. Navigate to **Programs**.<br>2. Inspect the row controls. Attempt delete if the control is visible. | The delete control (**🗑**) is hidden, **or** a confirmed delete returns **403** with a clear message. The program is **not** deleted. | High |
| TC-011 | Conflict / 404 when the program was already deleted by another admin | Two admin sessions A and B. Both have program `I.G. Race Delete ${timestamp}` visible. | 1. In B, delete `I.G. Race Delete ${timestamp}` (confirm).<br>2. In A, click delete on the same row and confirm. | A's request returns **404** (or app-level "no longer exists"). User in A sees a clear message; the row disappears from A's list (re-fetch). No phantom delete success and no crash. Pairs with DS-2 TC-013. | Medium |
| TC-012 | Closing the confirmation dialog without explicitly confirming or cancelling does **not** delete | Admin. Program `I.G. EscClose ${timestamp}` exists. | 1. Click delete on `I.G. EscClose ${timestamp}`.<br>2. Dismiss the dialog via **Esc** / backdrop / **X** (whichever the dialog supports). | No delete request fires. Row remains in the list unchanged. (See ambiguity #4 — DS-4 only documents Cancel; non-Cancel dismissals must default to "no delete".) | High |

---

## Edge cases

| TC ID | Title (expected behavior) | Preconditions | Steps | Expected result | Priority |
|-------|---------------------------|---------------|-------|-----------------|----------|
| TC-013 | HTML-like text in program name is rendered as plain text in the confirmation dialog (no XSS) | Admin. Program `I.G. <img src=x onerror=alert(1)> ${timestamp}` exists (created via DS-1 TC-013). | 1. Click delete on that row.<br>2. Read the dialog. | No JS dialog/alert fires from the program name. The dialog text shows the literal escaped string. Cancel and the row remains intact (or confirm and it deletes cleanly). | High |
| TC-014 | Special characters and Unicode in program name appear correctly in the confirmation dialog | Admin. Program `I.G. Renée's "Accelerated" Program ${timestamp}` exists. | 1. Click delete on that row.<br>2. Read the dialog. | Apostrophe, smart quotes, and accented characters render exactly as stored. Confirming removes the row cleanly. | Medium |
| TC-015 | Deleting the last program reveals an empty state | Admin. Exactly one program `I.G. Solo ${timestamp}` exists in the user's programs list. | 1. Click delete on `I.G. Solo ${timestamp}` and confirm. | Row disappears. The list shows the **empty state** (whatever copy + CTA the product specifies — see ambiguity #6). No stale row, no broken layout. | Medium |
| TC-016 | Deleting one row of a legacy duplicate-name pair removes only that row | Admin. Two programs sharing the name `I.G. Duplicate Name ${timestamp}` exist via direct DB seed or data import (see ambiguity #11; this state is **only** reachable through legacy data per DS-3 AC3). | 1. Click delete on the **second** row only.<br>2. Confirm. | Only the targeted row is removed. The first `I.G. Duplicate Name ${timestamp}` row remains unchanged. The dialog wording, regardless of phrasing, must allow the user to identify which row is being deleted (by ID or by additional metadata — see ambiguity #5). Pairs with DS-2 TC-018. | Medium |
| TC-017 | Name freed by delete is re-usable in a subsequent Create | Admin. Program `I.G. Reusable ${timestamp}` exists. | 1. Delete `I.G. Reusable ${timestamp}` (confirm).<br>2. Open **+ New Program** and try to create a new program with the **same name** `I.G. Reusable ${timestamp}`. | Per DS-3 ambiguity #4 (post-delete name reuse): either step 2 succeeds (active programs are the only ones in the uniqueness scope — most likely) **or** step 2 is rejected because the name is reserved (stricter policy). The chosen behavior must be consistent and documented. Pairs with DS-3 TC-011. | Medium |
| TC-018 | Long program name (255 chars) is handled gracefully in the confirmation dialog | Admin. Program with 255-char name (created per DS-1 TC-011) exists. | 1. Click delete on that row.<br>2. Read the dialog.<br>3. Confirm. | Dialog text remains readable (truncation/ellipsis OK per UI). Confirm proceeds without breaking the dialog. Row is removed cleanly. | Low |
| TC-019 | Rapid double-activation of the delete control does not produce duplicate dialogs / errors | Admin. Program `I.G. DoubleDelete ${timestamp}` exists. | 1. Click the delete control twice in quick succession.<br>2. Confirm in whatever dialog ends up in front. | Exactly one confirmation dialog is shown (or the second is a no-op), and exactly one `DELETE` request fires. No "row already gone" error spam after one confirmation. | Medium |
| TC-020 | Concurrent confirmed deletes from two sessions on the same program | Two admin sessions A and B; both have `I.G. Concurrent ${timestamp}` open. | 1. In A, click delete and confirm.<br>2. In B, click delete and confirm at nearly the same time. | Server returns **success** to one client and **404 / no-op** to the other. The row is removed in both lists once they re-fetch. No crash, no duplicate error in either UI. | Low |
| TC-021 | After delete success, navigating away and back still shows deleted | Admin. Program `I.G. Obsolete ${timestamp}` deleted in TC-003-style flow. | 1. Navigate to **Dashboard**.<br>2. Navigate back to **Programs**. | Row does not reappear; server is source of truth. (Same expectation as TC-004; restated to emphasize the AC1 "removed from the program list" property survives navigation.) | Medium |
| TC-022 | Keyboard activation: focus + Enter on the delete control opens the same dialog | Admin. Program `I.G. Keyboard ${timestamp}` exists. | 1. Tab focus to the delete control on the row.<br>2. Press **Enter** (or **Space**, per UI). | Same confirmation dialog opens as in TC-001. Keyboard users can reach the same flow as mouse users. (See ambiguity #10 for full a11y treatment.) | Low |

---

## Ambiguities or gaps in the ACs

1. **Confirmation dialog implementation** — AC just says "confirmation dialog". It does not specify whether it is a **native** browser confirm (`window.confirm`), a **custom modal**, or some hybrid. The existing implementation (`tests/ds4-delete-program.spec.ts`) uses native confirm via Playwright's `page.on('dialog', …)`. This must be reconfirmed for new builds.
2. **Dialog wording** — AC does not specify any exact copy. The existing test asserts `Delete program "${programName}"? All its semesters and courses will be removed. This cannot be undone.` — that string is product-sourced, not Jira-sourced. The plan does not assume specific copy.
3. **Cascade to semesters/courses** — The existing dialog wording mentions semesters and courses being removed; DS-4's ACs say nothing about cascading deletes. **TC-020** stays at low priority until the cascade contract is confirmed.
4. **Dismissal mechanisms beyond Cancel** — AC2 only specifies the **Cancel** action. The plan (TC-012) assumes Esc / backdrop / X dismiss = no delete (the only safe default), but the AC does not say so.
5. **Identifying the row in the dialog when names duplicate** — DS-4's ACs and the existing dialog wording use only the program name. With legacy duplicate rows (per DS-2 ambiguity #10 and TC-016 here), the dialog cannot disambiguate by name alone. PM/UX confirmation needed.
6. **Empty state copy and CTA** — DS-4 says nothing about the empty state when the last program is deleted (TC-015). The existing test plan in Block 4 asserts a specific empty-state graphic + CTA copy ("No programs yet. Create your first program to get started."). Treat as product-specific, not AC-guaranteed.
7. **Success feedback** — AC1 only says the program is "removed from the program list". Whether a toast / banner / inline confirmation also fires (and its copy/duration) is not specified.
8. **Error feedback for failed delete** — TC-008, TC-009, TC-011 assume the UI surfaces an error and keeps the row. AC says nothing about failure UX.
9. **Role gating** — Story implies admin-only; ACs do not define non-admin behavior (hidden control vs visible-with-403). TC-010 lists the most defensible options. Same gap as DS-1, DS-2.
10. **Accessibility of the confirmation dialog** — No AC for keyboard reach, focus trap inside the dialog, focus return to the delete control on close, screen-reader announcement of the dialog content, or Esc-to-cancel behavior.
11. **Post-delete name reuse** — Cross-references DS-3 ambiguity #4. DS-4 does not say whether the deleted name is freed for reuse. TC-017 covers both possible policies.
12. **Optimistic UI vs wait-for-server** — Not specified whether the row hides instantly on confirm (optimistic) or only after the server response. Affects TC-009 expectations.
13. **Audit / undo** — No AC for an audit trail of deletions (who, when), and no undo / soft-delete affordance.
14. **Concurrent deletes** — TC-020 documents the expected race outcome; AC says nothing about concurrency or idempotency.

---

## Re-evaluation against ACs

- **AC1** ("Delete program with confirmation") — fully covered by **TC-001** (confirmation dialog opens, no premature delete), **TC-002** (confirm removes the row from the list), **TC-003** (same flow on an I.G. row), and **TC-004** (deletion persists across navigation).
- **AC2** ("Cancel program deletion") — fully covered by **TC-005** (Cancel button leaves row intact), **TC-006** (cancel does not lock the row from a future delete), **TC-007** (cancel scoped to the row in question only).
- **Negative coverage** adds: server failure (TC-008), network timeout (TC-009), role gating (TC-010), conflict / 404 from concurrent admin (TC-011), non-Cancel dismissal defaults to no-delete (TC-012).
- **Edge coverage** adds: XSS-safe dialog (TC-013), Unicode in dialog (TC-014), empty state after deleting the last program (TC-015), legacy duplicate-row targeting (TC-016, pairs with DS-2 TC-018), post-delete name reuse (TC-017, pairs with DS-3 TC-011), long-name dialog readability (TC-018), double-activation idempotency (TC-019), concurrent-delete race (TC-020), navigation persistence (TC-021), keyboard activation (TC-022).

Both Jira ACs have at least one positive test case anchored on the verbatim AC strings; the major negative and edge behaviors are covered; explicit gaps in the ACs are listed above for product/PM follow-up.

---

## Cross-ticket reconciliation (relationships to other Block 5 plans)

| Topic | Block 5 source of truth | This plan's coverage | Notes |
|---|---|---|---|
| Conflict / 404 between two admins (mid-edit on deleted program) | `Block5_TestPlan_DS-2.md` TC-013 | TC-011 (delete vs delete) | Pair; both expect graceful 404 handling. |
| Editing one row of a legacy duplicate pair | `Block5_TestPlan_DS-2.md` TC-018 | TC-016 (delete one row of a legacy duplicate pair) | Pair; both rely on direct DB seed for the precondition since DS-3 AC3 prevents creating duplicates via UI. |
| Post-delete name reuse | `Block5_TestPlan_DS-3.md` TC-011 (and DS-3 ambiguity #4) | TC-017 | DS-3 owns the policy decision; this plan only verifies the post-delete observable behavior. |
| Whitespace / empty / duplicate rejection on Create and Edit | `Block5_TestPlan_DS-3.md` AC3 | n/a (DS-4 does not create or rename) | DS-4 has no validation overlap with DS-3. |
| Non-admin role gating | All four plans (DS-1, DS-2, DS-3, DS-4) flag this as ambiguity | TC-010 | Same gap repeats; should be answered once at the product level. |

### Difference from `Block4/Block2_DS-4_tplan_Delete.md`

| Block 4 plan asserts | DS-4 ACs say | Action |
|---|---|---|
| Native `window.confirm` dialog | "confirmation dialog" (unspecified) | Treat as product knowledge, not AC. Implementation in `tests/ds4-delete-program.spec.ts` uses native dialog and passes today; if the product moves to a custom modal, the spec must change but DS-4 ACs would still hold. |
| Exact dialog copy with semester/course cascade | No copy, no cascade mention | Block 4 TC-001 asserts the exact string. This plan does not. Both can co-exist: Block 4 is a stricter regression suite; Block 5 is the AC-aligned suite. |
| Empty-state copy and graphic on last delete | No empty-state spec | Same as above; Block 4 asserts the literal copy, this plan only asserts that an empty state appears (TC-015). |
| Success "confirmation message" / toast | No success-feedback spec | This plan flags as ambiguity #7. Block 4 TC-001 asserts a success message; that assertion is only safe while the implementation continues to show one. |
