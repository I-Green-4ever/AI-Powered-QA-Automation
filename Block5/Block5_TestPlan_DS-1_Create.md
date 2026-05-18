# Test Plan: DS-1 — Create new academic program

**Source:** [DS-1 — Create new academic program](https://legionqaschool.atlassian.net/browse/DS-1) (Story, Project: Didaxis Studio, Status: In Progress)

**User story:** As an admin user, I want to create a new academic program so that I can begin designing its curriculum structure.

## Acceptance Criteria (from Jira DS-1)

```gherkin
Scenario: Navigate to program creation form
  Given I am logged in as admin
  When I navigate to the Programs page
  And I click "+ New Program"
  Then I see the program creation form with fields: Program Name, Description

Scenario: Successfully create a program
  Given I am on the program creation form
  When I fill in Program Name with "Web Development 2026"
  And I fill in Description with "Full-stack web development program"
  And I click Create
  Then the modal closes
  And the program list shows "Web Development 2026"

Scenario: Validation prevents empty program name
  Given I am on the program creation form
  When I leave the Program Name field empty
  Then the Create button is disabled
```

**AC coverage map:** AC1 → TC-001; AC2 → TC-002, TC-003, TC-004; AC3 → TC-006, TC-007. **Cross-coverage from DS-3:** TC-014 mirrors DS-3 AC3 (duplicate-name rejection).

> **Note:** all test data uses the prefix `I.G.` to keep author-generated rows distinguishable from product seed data and from rows created by other authors.

---

## Positive flows

| TC ID | Title (expected behavior) | Preconditions | Steps | Expected result | Priority |
|-------|---------------------------|---------------|-------|-----------------|----------|
| TC-001 | Clicking **+ New Program** opens the creation form with required fields | Logged in as admin at `https://test.didaxis.studio`. On `/programs`. | 1. Navigate to **Programs**.<br>2. Click **+ New Program**. | Modal **New Program** appears with: input **Program Name** (placeholder `e.g. Computer Science BSc`), input **Description** (placeholder `Brief description`), button **Create**. Focus is in the modal. | High |
| TC-002 | Creating with valid Program Name and Description succeeds | Logged in as admin. On `/programs`. **+ New Program** modal open. | 1. Type Program Name `I.G. Web Development 2026`.<br>2. Type Description `Full-stack web development program`.<br>3. Click **Create**. | Modal closes. New row **I.G. Web Development 2026** with description **Full-stack web development program** is visible in the programs list **without a manual refresh**. | High |
| TC-003 | Modal closes immediately after a successful Create | Same as TC-002. | 1. Submit a valid program (name `I.G. Smoke Create` + any description).<br>2. Click **Create**. | Within ~2s after click, the **New Program** dialog is no longer visible. No second click required. | High |
| TC-004 | Newly created program is persisted (visible after navigation) | Admin. Just created `I.G. Web Development 2026` per TC-002. | 1. Navigate to **Dashboard**.<br>2. Navigate back to **Programs**. | Row **I.G. Web Development 2026** is still present after re-fetch (server is source of truth). | Medium |
| TC-005 | Description is optional — program creates with name only | Admin. **+ New Program** modal open. | 1. Type Program Name `I.G. Name Only ${timestamp}`.<br>2. Leave Description empty.<br>3. Click **Create**. | If description is optional per product, modal closes and row appears with empty/blank description. **(See ambiguity #2 if Create is disabled instead.)** | Medium |

---

## Negative flows

| TC ID | Title (expected behavior) | Preconditions | Steps | Expected result | Priority |
|-------|---------------------------|---------------|-------|-----------------|----------|
| TC-006 | Empty Program Name keeps **Create** disabled (AC3) | Admin. **+ New Program** modal open. | 1. Leave **Program Name** empty.<br>2. Optionally type any description.<br>3. Hover/focus **Create**. | Button **Create** is disabled (`aria-disabled="true"` or `disabled`). Submitting via Enter does **not** create a program. Modal stays open. | High |
| TC-007 | Whitespace-only Program Name is treated as empty | Admin. Modal open. | 1. Type `   ` (spaces only) into Program Name.<br>2. Inspect Create button. | **Create** remains disabled (or server rejects with validation error and no row is added). No program named `"   "` ever appears in the list. | High |
| TC-008 | Cancelling the modal discards entered values and creates nothing | Admin. Modal open. | 1. Type Program Name `I.G. Cancelled ${timestamp}`.<br>2. Close modal (Esc / backdrop click / Cancel control).<br>3. Re-open **+ New Program**. | Modal closes without API call. Re-opened modal shows empty fields. Programs list does **not** contain `I.G. Cancelled …`. | Medium |
| TC-009 | Server failure (5xx) on Create surfaces an error and does not add a row | Admin. Force/mock `POST /programs` (or equivalent) to return **500**. Modal open. | 1. Fill valid Program Name + Description.<br>2. Click **Create**. | Error feedback is shown to the user. Modal stays open (or re-opens) so the data is not lost. No new row appears in the programs list. | High |
| TC-010 | Non-admin user cannot create programs (if role-gated) | Logged in as non-admin (e.g. `qa-viewer@school.edu`). | 1. Navigate to **Programs**.<br>2. Look for **+ New Program**. | Either the **+ New Program** button is hidden, or a Create attempt returns **403** with a clear message. No program is created. | High |

---

## Edge cases

| TC ID | Title (expected behavior) | Preconditions | Steps | Expected result | Priority |
|-------|---------------------------|---------------|-------|-----------------|----------|
| TC-011 | Maximum-length Program Name is accepted (boundary 255 chars) | Admin. Modal open. | 1. Fill Program Name with `I.G. ` followed by `P` × 250 (total 255 chars).<br>2. Fill Description `I.G. max name`.<br>3. Click **Create**. | Program is created and the row is visible. Long name is rendered without breaking layout (truncation/ellipsis OK per UI). | Medium |
| TC-012 | Special characters and Unicode in Program Name are preserved | Admin. Modal open. | 1. Program Name `I.G. Renée's "Accelerated" Program ${timestamp}`.<br>2. Description `I.G. special chars`.<br>3. Click **Create**. | Modal closes. Row displays the exact characters (apostrophe, smart quotes, accents) — no mojibake, no escaping artifacts. | Medium |
| TC-013 | HTML-like text in Program Name is rendered as plain text (no XSS) | Admin. Modal open. | 1. Program Name `I.G. <img src=x onerror=alert(1)> ${timestamp}`.<br>2. Description `I.G. xss`.<br>3. Click **Create**. | No JS dialog/alert fires. Row is added with the literal text shown escaped (no rendered image, no script execution). | High |
| TC-014 | Creating a second program with an existing name is rejected (DS-3 AC3 cross-coverage) | Admin. **+ New Program** modal closed; no program named `I.G. Duplicate Name ${timestamp}` exists. | 1. Open **+ New Program** and create program `I.G. Duplicate Name ${timestamp}` with description `I.G. first`. Verify the row appears in the list.<br>2. Open **+ New Program** again, type Program Name `I.G. Duplicate Name ${timestamp}` and Description `I.G. second`.<br>3. Click **Create**. | Step 1 succeeds. Step 3 is **rejected**: an error indicating the name already exists is shown (per DS-3 AC3). Modal stays open with the entered values preserved. The programs list still contains exactly **one** row with that name (the row from step 1). | High |
| TC-015 | Very long Description is accepted | Admin. Modal open. | 1. Program Name `I.G. Long Desc ${timestamp}`.<br>2. Description = 1000 chars of mixed text.<br>3. Click **Create**. | Program is created; long description is stored and rendered (truncation/wrapping OK). No layout break. | Low |
| TC-016 | Rapid double-click on **Create** does not create duplicate programs | Admin. Modal open. Network throttled to slow. | 1. Fill valid name `I.G. DoubleClick ${timestamp}` + description.<br>2. Click **Create** twice in quick succession. | Exactly **one** program with that name is created. UI either disables the button while the request is in-flight or de-duplicates the second click. | Medium |
| TC-017 | Closing the modal with **Esc** while typing discards input | Admin. Modal open. | 1. Type Program Name `I.G. EscDiscard`.<br>2. Press **Esc**. | Modal closes. No program is created. Re-opening **+ New Program** shows empty fields (not pre-filled with the previous draft). | Low |

---

## Ambiguities or gaps in the ACs

1. **Validation criteria for Program Name** — DS-1 AC3 mentions only "empty". **Whitespace-only** and **uniqueness** are now defined by DS-3 (whitespace = empty; duplicate names rejected) and are covered by TC-007 and TC-014. **Min length** and **max length** remain unspecified; TC-011 (255-char boundary) is a reasonable product assumption that should be confirmed with PM/UX.
2. **Description optionality** — AC2 fills a description, but no AC says the description is required. TC-005 assumes optional; if product treats it as required, TC-005's expected result changes (Create becomes disabled until Description is non-empty).
3. **Success feedback** — AC2 only states "modal closes" and the new row appears. **No AC** for a toast/snackbar/inline confirmation message, its copy, or duration.
4. **Error feedback for failed Create** — TC-009 assumes the UI surfaces an error and preserves form state on 5xx. AC does not specify the error UX, retry behavior, or whether the modal stays open.
5. **Role gating** — Story says "admin user," but ACs do not define the **non-admin** experience (button hidden vs visible-with-403 vs disabled with tooltip). TC-010 lists the most defensible behaviors.
6. **Duplicate-name policy** — Resolved by DS-3 AC3: duplicate names are rejected (see TC-014, and DS-3's plan for the full coverage). **Case-insensitivity** of the duplicate check, **post-trim** comparison, and **post-delete** name reuse are still open and are tracked in DS-3 (its TC-009, TC-010, TC-011).
7. **HTML/XSS handling** — Implicit security requirement; no explicit AC. TC-013 covers it as a must-have safety check.
8. **Sort/position of the new row** — Not specified whether the new program appears at the **top**, **bottom**, or in **alphabetical** order of the list. Tests assert visibility only.
9. **Accessibility** — No AC for keyboard navigation, focus trap inside the modal, focus return to **+ New Program** on close, label associations, or screen-reader announcements.
10. **Persistence / re-fetch** — TC-004 assumes the new program is persisted server-side; AC2 only asserts client-side list update. Server contract (`POST` status code, idempotency, response body) is not defined.

---

## Re-evaluation against ACs

- **AC1** ("Navigate to program creation form") — fully covered by **TC-001** (modal + fields + Create button).
- **AC2** ("Successfully create a program") — fully covered by **TC-002** (create), **TC-003** (modal closes), **TC-004** (persisted on re-navigation). TC-005 extends AC2 for the optional-description boundary.
- **AC3** ("Validation prevents empty program name") — fully covered by **TC-006**, with an extension in **TC-007** for whitespace-only.
- **Negative + edge** coverage adds: server failure (TC-009), role gating (TC-010), boundary length (TC-011), Unicode/special chars (TC-012), XSS safety (TC-013), **duplicate-name rejection (TC-014, mirroring DS-3 AC3)**, long description (TC-015), double-click idempotency (TC-016), and Esc-discard (TC-017).

All three Jira ACs have at least one positive test case; all stated negative behaviors are covered; explicit gaps in the ACs are listed above for product/PM follow-up.
