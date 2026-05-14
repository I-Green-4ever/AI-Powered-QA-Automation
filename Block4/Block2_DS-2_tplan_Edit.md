# Test Plan: Edit Existing Program Details

**Feature:** As an admin, I can edit an existing program’s details to correct or update information after creation.  
**Scope:** Edit Program flow (✏️ → Edit Program modal → Save → API update → modal close + list refresh).

---

## 1. Positive flows

| ID | Title | Preconditions | Steps | Expected result | Priority |
|----|--------|---------------|-------|-----------------|----------|
| **TC-001** | Edit form opens with current program data | Logged in as admin. On **Programs** page. Program **Web Development 2026** exists with known values for **Name**, **Description**, **Total Hours**, **Default Session Hours**, **Default Exam Hours**, **Target Audience**, **Focus Areas**, **Sync/Async Ratio**. | 1. Locate row **Web Development 2026**. 2. Click the ✏️ (edit) icon on that row. | **Edit Program** modal opens. **Program Name** shows `Web Development 2026`. **Description** matches saved value. **AI Generation Config** (when expanded) shows **Total Hours**, **Default Session Hours**, **Default Exam Hours**, **Target Audience**, **Focus Areas**, **Sync/Async Ratio** matching the server data. | High |
| **TC-002** | Renaming a program updates the list immediately after save | Same as TC-001; modal open for **Web Development 2026**. | 1. Set **Program Name** to `Web Development 2026 - Updated`. 2. Click **Save**. | Modal closes. Program list **re-fetches** and shows **Web Development 2026 - Updated** **without** manual browser refresh. No stale name in the grid. | High |
| **TC-003** | Updating only Description leaves Name and other fields unchanged | Modal open for a program with **Name** `Web Development 2026`, non-empty **Description**, and populated AI fields. Record all field values before edit. | 1. Change **Description** only to a new distinct text (e.g. `Updated description for WD 2026.`). 2. Click **Save**. | Modal closes; list refreshes. **Program Name** remains `Web Development 2026`. **Default Session Hours**, **Default Exam Hours**, **Target Audience**, **Focus Areas**, **Sync/Async Ratio**, and **Total Hours** unchanged vs. recorded values (verify via reopening edit or list columns if surfaced). **Description** shows the new text where displayed. | High |
| **TC-004** | Successful save closes modal and shows success path with consistent UI | Program exists; network healthy. | 1. Open edit. 2. Make any valid change. 3. Click **Save**. | Modal closes. No error banner for success path (unless product always shows toast—match spec). List reflects mutation immediately (refresh behavior). | Medium |
| **TC-005** | Save applies trim on Program Name without altering intended characters | Modal open. | 1. Set **Program Name** to `  Web Development 2026 - Trimmed  `. 2. Click **Save**. | Name stored/displayed as `Web Development 2026 - Trimmed` (leading/trailing spaces removed). List updates immediately. | Medium |
| **TC-006** | Single save can update Name and multiple AI Generation Config fields together | Modal open; **AI Generation Config** expanded. | 1. Change **Program Name**, **Total Hours**, **Default Session Hours**, **Target Audience**, and **Sync/Async Ratio**. 2. Click **Save**. | All changes persist after list refresh; reopening edit shows updated values. | Medium |
| **TC-007** | Collapsible **AI Generation Config** can be expanded and edited | Modal open. | 1. Expand **AI Generation Config**. 2. Change **Default Exam Hours** from `3` to `2.5`. 3. **Save**. | Section remains usable; value persists after save and refresh. | Low |
| **TC-008** | Modal can be dismissed without saving via **X**, **Cancel**, and outside click | Modal open with unsaved edits. | 1. Change a field (do not save). 2. Close via **X**; repeat with **Cancel**; repeat by clicking overlay/outside modal. | Each time: modal closes, no API update (verify list unchanged). Reopening edit shows original server values. | High |

---

## 2. Negative flows

| ID | Title | Preconditions | Steps | Expected result | Priority |
|----|--------|---------------|-------|-----------------|----------|
| **TC-009** | **Save** remains disabled when **Program Name** is empty | Edit modal open. | 1. Clear **Program Name** completely. 2. Observe **Save**. | **Save** is disabled (not clickable). Submitting via keyboard/other means must not issue update if enforced in UI only—ideally API also rejects; document actual behavior. | High |
| **TC-010** | Whitespace-only **Program Name** is not accepted as a valid name on submit | **Save** enabled only if name has non-whitespace after trim (if UI allows typing spaces). | 1. Enter only spaces in **Program Name**. 2. If **Save** is enabled, click **Save**; if disabled, attempt any alternate submit. | User cannot persist a whitespace-only name: either **Save** disabled or validation error; no successful update; program list unchanged. | High |
| **TC-011** | Duplicate **Program Name** within the same organization is rejected | Another program exists named **UX Design Basics**. Editing **Web Development 2026**. | 1. Set **Program Name** to **UX Design Basics**. 2. Click **Save**. | Error displayed (modal stays open per failure rule). **Web Development 2026** row unchanged after list stabilizes; **UX Design Basics** unaffected. | High |
| **TC-012** | **Program Name** longer than 100 characters is rejected | Modal open. | 1. Set **Program Name** to a 101-character string. 2. **Save**. | Validation error; no successful update (or character limit prevents input—match implementation). | High |
| **TC-013** | **Description** longer than 500 characters is rejected | Modal open. | 1. Set **Description** to 501 characters. 2. **Save**. | Validation error; update not persisted. | Medium |
| **TC-014** | **Total Hours** below minimum is rejected when the field is validated on edit | If form validates **Total Hours** with **Min 1** when provided. | 1. Expand **AI Generation Config**. 2. Set **Total Hours** to `0` or empty if UI maps empty to invalid. 3. **Save**. | Error or prevented submit; invalid value not saved. *(If empty is allowed, record as gap—see ambiguities.)* | Medium |
| **TC-015** | **Default Session Hours** outside 0.5–12 or off 0.5 step is rejected | Modal open; section expanded. | 1. Set **Default Session Hours** to `0.25` or `12.5`. 2. **Save**. | Validation error or step correction; invalid value not persisted. | Medium |
| **TC-016** | **Default Exam Hours** outside 0.5–12 or off 0.5 step is rejected | Same as TC-015 for **Default Exam Hours**. | 1. Try `0.25` and `13`. 2. **Save**. | Same as TC-015. | Medium |
| **TC-017** | **Sync/Async Ratio** outside 0–100 is rejected | Modal open; slider or numeric entry. | 1. Attempt `-1` or `101` if possible. 2. **Save**. | Input clamped or validation error; value not saved out of range. | Medium |
| **TC-018** | Failed API update shows error and does not falsely succeed | Modal open; simulate update failure (network offline, 500, or mock). | 1. Make valid edit. 2. **Save** while API fails. | Error message displayed. Modal **remains open** (unless spec says otherwise). Program list **does not** show the new values after refresh completes; original data intact. | High |
| **TC-019** | No silent partial update when validation fails mid-form | Modal open. | 1. Set valid **Name** but invalid **Default Session Hours**. 2. **Save**. | No successful update of **Name** or other fields; error shown; server state unchanged for that program. | Medium |

---

## 3. Edge cases

| ID | Title | Preconditions | Steps | Expected result | Priority |
|----|--------|---------------|-------|-----------------|----------|
| **TC-020** | **Program Name** at exactly 100 characters saves and displays correctly | Valid 100-char unique name prepared. | 1. Set **Program Name** to that 100-char string. 2. **Save**. | Success; list refresh shows full name (truncation only if product design says so—document). | Medium |
| **TC-021** | **Description** at exactly 500 characters saves | 500-char string prepared. | 1. Paste into **Description**. 2. **Save**. | Success; value persisted. | Medium |
| **TC-022** | Special characters and Unicode in **Name** and **Description** are stored and shown correctly | Names like `Café & React <2026>`, description with quotes, newlines if allowed. | 1. Enter safe Unicode and symbols. 2. **Save**. | Data round-trips correctly in list and on reopen; no broken HTML/encoding (no script execution in app). | Medium |
| **TC-023** | **Default Session Hours** and **Default Exam Hours** at boundaries 0.5 and 12 with 0.5 steps | Modal open. | 1. Set **Default Session Hours** to `0.5` then `12`. 2. Set **Default Exam Hours** to `0.5` then `12`. 3. **Save** after each valid combination or once with both at min/max per test design. | All boundary values accepted and persisted. | Medium |
| **TC-024** | **Sync/Async Ratio** at 0 and at 100 | Modal open. | 1. Set ratio to `0`, **Save**, reopen. 2. Set to `100`, **Save**, reopen. | Both extremes persist. | Low |
| **TC-025** | **Total Hours** at minimum `1` when provided | If field is filled. | 1. Set **Total Hours** to `1`. 2. **Save**. | Accepted and persisted. | Medium |
| **TC-026** | User clears all optional / non-required prepopulated content while keeping a valid **Program Name** | Program has **Description**, **Target Audience**, **Focus Areas**, optional numerics populated. | 1. Clear **Description**, **Target Audience**, **Focus Areas**. 2. Clear **Total Hours** if UI allows null. 3. Reset sliders/defaults per UI (e.g. **Sync/Async Ratio** to empty vs default **70**—match spec). 4. **Save**. | **Program Name** unchanged unless edited. Cleared fields persist as empty or documented defaults; no server 500; list refresh matches. | High |
| **TC-027** | User deletes every editable value including **Program Name** (all fields empty where possible) | Modal open. | 1. Clear **Program Name** and all other clearable fields. | **Save** disabled for empty name. If other required rules exist, those errors appear. No partial save. | High |
| **TC-028** | Rapid double-click **Save** does not create duplicate requests or inconsistent UI | Valid edit. | 1. Double-click **Save** quickly. | At most one successful update (or idempotent behavior); modal and list remain consistent; no duplicate error spam beyond one failed retry if applicable. | Medium |
| **TC-029** | List refresh after edit does not require full page reload | After any successful mutation in this flow. | 1. Observe whether only the program list/data is re-fetched vs full navigation. | Row updates match server without F5; timing acceptable (no indefinite stale row). | High |
| **TC-030** | **AI Generation Config** default display matches spec when optional fields were never set | Program created with minimal data. | 1. Open edit. 2. Expand **AI Generation Config**. | **Default Session Hours** shows `4`, **Default Exam Hours** shows `3`, **Sync/Async Ratio** shows `70` per field table (or DB null—document mismatch if any). | Low |

---

## 4. Traceability (AC coverage)

| Acceptance scenario | Covered by |
|---------------------|------------|
| Open program for editing; form pre-populated | **TC-001** |
| Edit name → Save → modal closes → list shows new name immediately | **TC-002**, **TC-029** |
| Edit only Description → Name and other fields unchanged | **TC-003** |
| Refresh without manual page reload | **TC-002**, **TC-029** |
| Modal close without save | **TC-008** |
| Save disabled when name empty | **TC-009**, **TC-027** |
| Failure shows error | **TC-018** |

---

## 5. Ambiguities and gaps in the ACs

1. **Uniqueness rule:** AC implies name uniqueness “per organization” but does not specify the exact error copy, field-level vs global message, or behavior if the conflict is with a **soft-deleted** program.  
2. **Total Hours:** Marked optional on the entity but “required for AI curriculum generation”; AC does not say whether **Save** on edit allows null/empty **Total Hours** or always validates **Min 1** when the field is touched.  
3. **Defaults vs stored nulls:** Field table lists defaults (e.g. **Sync/Async Ratio** `70`, session `4`, exam `3`); unclear whether these are UI-only defaults or persisted values when the user never set them—**TC-030** captures the need to align implementation with expectations.  
4. **“Immediately”:** No latency/loading criteria (skeleton row, optimistic update vs full refetch); only “must not require manual refresh” is explicit.  
5. **Outside-click to close:** Not stated whether unsaved changes trigger a confirmation dialog; risk of accidental data loss.  
6. **Permissions:** “Admin” is assumed; AC does not define non-admin denial, read-only programs, or cross-tenant isolation beyond name uniqueness.  
7. **Concurrent edits:** Two admins editing the same program—no last-write-wins vs conflict handling specified.  
8. **Trim behavior:** Mentioned in notes for submit, not in AC scenarios; whitespace-only rejection needs explicit expected message/disabled **Save** alignment.  

This plan uses the real labels **Program Name**, **Description**, **Total Hours**, **Default Session Hours**, **Default Exam Hours**, **Target Audience**, **Focus Areas**, **Sync/Async Ratio**, program **Web Development 2026**, and the **Edit Program** / **Save** actions as described in your ticket.
