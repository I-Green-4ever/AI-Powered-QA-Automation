# Test Plan: DS-2 — Edit existing program details

**Source:** [DS-2 — Edit existing program details](https://legionqaschool.atlassian.net/browse/DS-2) (Story, Project: Didaxis Studio, Status: In Progress)

**User story:** As an admin user, I want to edit an existing program's details so that I can correct or update program information after creation.

## Acceptance Criteria (from Jira DS-2)

```gherkin
Scenario: Open program for editing
  Given I am on the Programs page
  And a program "Web Development 2026" exists
  When I click the edit icon on "Web Development 2026"
  Then I see the edit form pre-populated with the program's current data

Scenario: Successfully edit a program name
  Given I am editing "Web Development 2026"
  When I change the Name to "Web Development 2026 - Updated"
  And I click Save
  Then the modal closes
  And the program list immediately shows "Web Development 2026 - Updated"

Scenario: Edit preserves unchanged fields
  Given I am editing a program
  When I only change the Description
  And I click Save
  Then the Name and other fields remain unchanged
```

**AC coverage map:** AC1 → TC-001, TC-002; AC2 → TC-003, TC-004, TC-005; AC3 → TC-006, TC-007.

> **Note:** the Block 4 manual-inspection notes (`Block4-didaxis-req.md`) cover the **Create** flow only. The exact selector/icon for **Edit** is not yet documented; this plan assumes a per-row edit control (e.g. a pencil icon `✏️` next to the existing `🗑` delete control) and an **Edit Program** modal mirroring the **New Program** modal. See ambiguity #1.

---

## Positive flows

| TC ID | Title (expected behavior) | Preconditions | Steps | Expected result | Priority |
|-------|---------------------------|---------------|-------|-----------------|----------|
| TC-001 | Clicking the edit control on a program row opens the **Edit Program** form | Logged in as admin at `https://test.didaxis.studio`. Program **Web Development 2026** with description **Full-stack web development program** exists in the list. | 1. Navigate to **Programs**.<br>2. Locate the row **Web Development 2026**.<br>3. Click the row's **edit** control (e.g. **✏️**). | Modal **Edit Program** opens. Focus is inside the modal. A **Save** (or **Update**) button is present along with a way to dismiss the modal. | High |
| TC-002 | Edit form is pre-populated with the program's current data (AC1) | Same as TC-001. | 1. Open edit on **Web Development 2026**.<br>2. Inspect each field. | **Program Name** field value is exactly `Web Development 2026`. **Description** field value is exactly `Full-stack web development program`. No placeholder text shown for either field. | High |
| TC-003 | Editing the Name and saving updates the row in the list (AC2) | Admin. Edit modal open on **Web Development 2026**. | 1. Clear **Program Name**.<br>2. Type `Web Development 2026 - Updated`.<br>3. Click **Save**. | Modal closes. Programs list **immediately** (no manual refresh) shows row **Web Development 2026 - Updated**. The previous name **Web Development 2026** no longer appears. | High |
| TC-004 | The save persists across navigation | Admin. Just performed TC-003. | 1. Navigate to **Dashboard**.<br>2. Navigate back to **Programs**. | Row **Web Development 2026 - Updated** is still present (server is source of truth). The pre-edit name does not reappear. | High |
| TC-005 | Editing both Name and Description in one save updates both | Admin. Program **IG - Edit Both `${timestamp}`** with description `IG - before` exists. Edit modal open. | 1. Change Name to `IG - Edit Both `${timestamp}` Updated`.<br>2. Change Description to `IG - after`.<br>3. Click **Save**. | Modal closes. Row shows new Name and new Description simultaneously. Single round-trip on the network (no double save). | Medium |
| TC-006 | Editing only the Description preserves the Name (AC3) | Admin. Program **IG - Desc Only `${timestamp}`** with description `IG - before` exists. Edit modal open. | 1. Leave **Program Name** untouched.<br>2. Change **Description** to `IG - after`.<br>3. Click **Save**. | Modal closes. Row's Name is still `IG - Desc Only ${timestamp}`. Description is now `IG - after`. No other field is altered. | High |
| TC-007 | Editing only the Name preserves the Description (AC3 mirror) | Admin. Program **IG - Name Only `${timestamp}`** with description `keep me` exists. Edit modal open. | 1. Change **Program Name** only.<br>2. Click **Save**. | Modal closes. Description still reads `keep me`. Only Name changed. | Medium |
| TC-008 | Re-opening edit after save shows the new values pre-populated | Admin. Program just edited via TC-003. | 1. Click **edit** on the updated row.<br>2. Inspect the fields. | Name shows `Web Development 2026 - Updated`. Description unchanged from prior save. No stale "before" data. | Medium |

---

## Negative flows

| TC ID | Title (expected behavior) | Preconditions | Steps | Expected result | Priority |
|-------|---------------------------|---------------|-------|-----------------|----------|
| TC-009 | Clearing **Program Name** disables **Save** | Admin. Edit modal open on any program. | 1. Select all in **Program Name** and delete it.<br>2. Inspect the **Save** button. | **Save** is disabled (`aria-disabled="true"` or `disabled`). Pressing **Enter** does **not** submit. Modal stays open. (Mirrors DS-1 AC3 for Create.) | High |
| TC-010 | Whitespace-only **Program Name** is treated as empty | Admin. Edit modal open. | 1. Replace Name with `   ` (only spaces).<br>2. Try to **Save**. | Save is disabled, or server rejects with a validation error. Row name in the list does not change to `"   "`. | High |
| TC-011 | Cancel / Esc / backdrop click discards in-progress edits | Admin. Edit modal open on **Web Development 2026 - Updated**. | 1. Change Name to `IG - DiscardMe`.<br>2. Close modal (Cancel button / **Esc** / backdrop). | Modal closes without API call. Row name is still **Web Development 2026 - Updated**. Re-opening edit shows the **previous** Name, not the abandoned draft. | High |
| TC-012 | Server failure on save (5xx) does not update the list | Admin. Edit modal open. Force/mock `PUT/PATCH /programs/:id` to return **500**. | 1. Change Name to `IG - 500 ${timestamp}`.<br>2. Click **Save**. | An error is shown to the user. Modal stays open with the user's edits intact. List row continues to display the **pre-edit** values. | High |
| TC-013 | Conflict / 404 when the program was deleted by another user | Two browsers — Admin A and Admin B. Both have **IG - Conflict** open. | 1. In B, delete **IG - Conflict** (per DS-4 flow).<br>2. In A, change Name and click **Save**. | Save returns **404** (or app-level conflict). User is shown an error and the program is **not** re-created. List in A re-fetches and the row disappears. | Medium |
| TC-014 | Non-admin user cannot edit programs (if role-gated) | Logged in as a non-admin (e.g. `qa-viewer@school.edu`). | 1. Navigate to **Programs**.<br>2. Look for the edit control on any row. Attempt edit if visible. | The edit control is hidden, **or** a save attempt returns **403**. The program's data is unchanged. | High |

---

## Edge cases

| TC ID | Title (expected behavior) | Preconditions | Steps | Expected result | Priority |
|-------|---------------------------|---------------|-------|-----------------|----------|
| TC-015 | Editing to a name length of 255 chars succeeds | Admin. Edit modal open on **IG - LongName Target**. | 1. Replace Name with `P` × 255.<br>2. Click **Save**. | Modal closes; row updates to the long name. List layout does not break (truncation/ellipsis OK). | Medium |
| TC-016 | Editing to special characters / Unicode preserves them exactly | Admin. Edit modal open. | 1. Replace Name with `Renée's "Accelerated" Updated ${timestamp}`.<br>2. Click **Save**. | Row displays the apostrophe, smart quotes, and accented characters exactly. No mojibake or HTML-encoding artifacts. | Medium |
| TC-017 | Editing to HTML-like text does not execute as script (XSS) | Admin. Edit modal open. | 1. Replace Name with `<img src=x onerror=alert(1)> ${timestamp}`.<br>2. Click **Save**. | No JS dialog/alert fires. The literal text is rendered escaped in the row. Re-opening edit shows the same literal string. | High |
| TC-018 | Editing one row of a duplicate-name pair targets only that row (defensive: legacy / imported data) | Admin. Two programs sharing the name `I.G. Duplicate Name ${timestamp}` exist via direct DB seed or data import (since the create flow now rejects duplicates per DS-3 AC3, this state is **only** reachable through legacy data — see ambiguity #10). | 1. Open edit on the **second** row only.<br>2. Change Name to `I.G. Duplicate Name ${timestamp} - Edited`.<br>3. Click **Save**. | Only the targeted row is renamed. The first `I.G. Duplicate Name ${timestamp}` row remains unchanged. List shows exactly one row with each name (the original and the edited). The edit must not silently rename the wrong row. | Medium |
| TC-019 | Editing to a name that matches another existing program is rejected (DS-3 AC3 cross-coverage) | Admin. Programs **I.G. Existing A** and **I.G. Existing B** both exist. Edit modal open on **I.G. Existing B**. | 1. Change **I.G. Existing B**'s Name to `I.G. Existing A`.<br>2. Click **Save**. | Save is **rejected** with a duplicate-name error (per DS-3 AC3). Modal stays open with the entered value preserved. The list still contains exactly one row named **I.G. Existing A** and one row still named **I.G. Existing B** (no rename took effect). | High |
| TC-020 | Saving with no changes is a no-op | Admin. Edit modal open. | 1. Open edit, change nothing, click **Save**. | Modal closes. Row is unchanged. Optionally, no API call is made (or a no-op call returns 200/304 with the same data). No spurious "updated" toast for unchanged values. | Low |
| TC-021 | Rapid double-click on **Save** does not create duplicate updates | Admin. Edit modal open. Network throttled. | 1. Change Name.<br>2. Click **Save** twice in quick succession. | Exactly one update request takes effect. UI either disables **Save** while in-flight or de-duplicates the second click. List shows one row with the new Name. | Medium |
| TC-022 | Pressing **Esc** while editing focused on a field discards changes | Admin. Edit modal open. | 1. Change Name in the input.<br>2. Press **Esc**. | Modal closes. Row name unchanged. Re-opening edit shows the original (pre-discard) values. | Low |

---

## Ambiguities or gaps in the ACs

1. **Edit entry point** — ACs say "click the edit icon" but the displayed icon, its accessible name, and its location in each row are not documented in `Block4-didaxis-req.md`. The plan assumes a per-row edit control next to the delete `🗑`. Confirm with PM/UX (e.g. `getByRole('button', { name: '✏️' })` or `name: 'Edit'`).
2. **Save vs Update button label** — AC2 says "click Save" but the Create flow uses **Create**. Confirm the actual label on the edit modal (`Save`, `Update`, or other) before automating.
3. **Validation rules** — AC does not specify rules for empty/whitespace name on **edit**. TC-009 and TC-010 mirror DS-1 AC3 by analogy; product confirmation needed.
4. **Description rules** — Not specified whether description can be edited to empty, or whether it is optional on edit (matches DS-1 ambiguity #2).
5. **Concurrency / ETags** — No AC for two admins editing the same program simultaneously. TC-013 covers the delete-vs-edit case; an edit-vs-edit "last write wins" vs optimistic-locking decision is not defined.
6. **Audit / change history** — No AC for any audit trail of edits (who, when, before/after).
7. **Success feedback** — AC2 says "modal closes" and the list updates; no AC for a toast or confirmation message wording.
8. **Error feedback** — TC-012 assumes the modal stays open and the error is surfaced; AC does not define error UX, retry behavior, or whether unsaved values are preserved.
9. **Role gating** — Story implies admin-only; ACs do not define non-admin behavior (hidden control vs visible-with-403). TC-014 lists the most defensible options.
10. **Legacy / imported duplicate rows** — DS-3 AC3 prevents duplicate names on **Create** (and on **Edit** rename via TC-019). It does not specify behavior when two rows already share a name due to data migration, direct DB seed, or a pre-DS-3 defect. TC-018 covers the defensive "edit the right row" case for that legacy state. Confirm whether the product also runs a data-cleanup pass to deduplicate legacy rows.
11. **Field set scope** — AC3 says "the Name and other fields remain unchanged" but the only documented fields are Name and Description. If additional fields are introduced later (e.g. semesters count, tags), the AC's "other fields" coverage will need re-asserting in tests.

---

## Re-evaluation against ACs

- **AC1** ("Open program for editing — pre-populated form") — fully covered by **TC-001** (modal opens) and **TC-002** (fields pre-populated with current data).
- **AC2** ("Successfully edit a program name") — fully covered by **TC-003** (rename + immediate list update), **TC-004** (persisted across navigation), and **TC-005** (combined name + description edit).
- **AC3** ("Edit preserves unchanged fields") — fully covered by **TC-006** (description-only edit preserves name) and **TC-007** (name-only edit preserves description).
- **Negative coverage** adds: empty/whitespace name (TC-009/010), discard via cancel/Esc/backdrop (TC-011), server 5xx (TC-012), conflict/404 (TC-013), role gating (TC-014).
- **Edge coverage** adds: 255-char name (TC-015), Unicode (TC-016), XSS-safe rendering (TC-017), legacy duplicate-row targeting (TC-018), **rename-to-existing-name rejected (TC-019, per DS-3 AC3)**, no-op save (TC-020), double-click idempotency (TC-021), Esc discards (TC-022).

All three Jira ACs have at least one positive test case; common negative and edge behaviors are covered; explicit gaps in the ACs are listed above for product/PM follow-up.
