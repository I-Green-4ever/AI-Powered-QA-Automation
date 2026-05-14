## Test Plan: Program Name Validation and Duplicate Prevention

### Scope
Validates `Program Name` behavior for the **Create** modal and the shared validation rules that apply across Create and Edit, including trimming, duplicate prevention, special characters, server-side validation limits, modal behavior, and immediate list refresh after successful mutation.

> **Coverage split with sibling plans (deduplicated):** Edit-modal scenarios for the same rules (whitespace-only on edit, duplicate name on edit, special characters on edit, clearing all editable values on edit) are owned by **`Block4_output_DS-2.md`** (Edit Existing Program Details) and are cross-referenced here rather than duplicated. This file owns the Create-flow scenarios and shared validation rules exercised via the Create modal.

### Assumptions
- `Program Name` uniqueness is enforced within the same organization.
- API returns `409` or `400` for duplicates (as specified).
- `Program Name` max length is assumed to be **100** chars (same server-side validation section).
- Program list is expected to re-fetch and reflect persisted server state after successful create/edit/delete (delete-specific UI/API scenarios belong in the Delete Program test plan; this document covers name validation via the Create path with edit-side cross-references).

---

## Positive Flows

| ID | Title | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|
| TC-001 | Program is created successfully with valid special-character name | Admin user is on Program list page; Create Program modal accessible | 1. Click `Create Program`.<br>2. Enter `Program Name` = `Informatique & IA - Niveau 2`.<br>3. Enter `Description` = `Advanced AI foundations`.<br>4. Click `Save`. | Create API is sent once; success response received; modal closes; new program appears immediately in list without manual refresh. | High |
| TC-002 | Create button is enabled when Program Name has non-empty valid text | Create modal accessible | 1. Open Create modal.<br>2. Type `Web Development 2026` in `Program Name`.<br>3. Observe `Save` button state. | `Save` button is enabled when `Program Name` is non-empty. | Medium |
| TC-003 | Closing Create modal without saving does not mutate data | Create modal accessible | 1. Open Create modal and type valid values.<br>2. Close via `X`.<br>3. Repeat and close via `Cancel`.<br>4. Repeat and click outside modal. | No create API call; modal closes; list remains unchanged. | Medium |
| TC-004 | Collapsible AI Generation Config on Create can expand/collapse without impacting valid save | Create modal open | 1. Expand `AI Generation Config`.<br>2. Enter optional values (e.g., `Total Hours` = `40`, `Target Audience` = `Beginners`).<br>3. Collapse section.<br>4. Save valid program. | Toggle works; values persist while modal open; save succeeds when required fields are valid. | Low |

---

## Negative Flows

| ID | Title | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|
| TC-005 | Whitespace-only name is rejected on Create | Create modal open | 1. Enter `Program Name` = `   `.<br>2. Fill any other required fields.<br>3. Click `Save`. | Name is trimmed to empty; submission blocked; modal remains open; no create API call. | High |
| TC-006 | Duplicate program name is rejected on Create | Program `Web Development 2026` already exists in same organization | 1. Open Create modal.<br>2. Enter `Program Name` = `Web Development 2026`.<br>3. Click `Save`. | API returns duplicate error (`400/409`); user-facing error shown (`name already exists`); modal stays open; no duplicate row added. | High |
| TC-007 | Program name over 100 characters is rejected on Create | Create modal open | 1. Enter 101-char `Program Name`.<br>2. Click `Save`. | API returns `400`; clear error displayed; modal remains open; no persisted mutation in list. | High |
| TC-008 | Description over 500 characters is rejected on Create | Create modal open | 1. Enter valid `Program Name`.<br>2. Enter 501-char `Description`.<br>3. Click `Save`. | API returns `400`; error displayed; modal remains open; list unchanged. | Medium |
| TC-009 | Save cannot be triggered with empty Program Name on Create | Create modal open | 1. Clear `Program Name` completely.<br>2. Attempt click `Save` or press Enter. | `Save` remains disabled; no API request fired; no explicit error required. | High |

---

## Edge Cases

| ID | Title | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|
| TC-010 | Leading/trailing spaces are trimmed and valid unique name is accepted on Create | Create modal open; no existing exact trimmed duplicate | 1. Enter `Program Name` = `  Web Development 2027  `.<br>2. Click `Save`. | Submitted value is trimmed to `Web Development 2027`; create succeeds; list displays trimmed name. | High |
| TC-011 | Trimmed duplicate is rejected on Create (space-padding bypass is not allowed) | `Web Development 2026` already exists | 1. In Create modal, set `Program Name` = `  Web Development 2026  `.<br>2. Click `Save`. | System trims before validation; duplicate detected; error shown; no mutation persisted. | High |
| TC-012 | Name at exact max length (100 chars) is accepted on Create | Create modal open | 1. Enter exactly 100-char `Program Name`.<br>2. Click `Save`. | Create succeeds; no length error; list updates immediately. | Medium |
| TC-013 | Description at exact max length (500 chars) is accepted on Create | Create modal open | 1. Enter valid `Program Name`.<br>2. Enter exactly 500-char `Description`.<br>3. Click `Save`. | Save succeeds; modal closes; list reflects updated program immediately. | Low |
| TC-014 | Failed Create keeps modal open and preserves user input for correction | Force server error (e.g., duplicate or 400 validation) on Create | 1. Submit invalid data via Create that triggers server error.<br>2. Observe modal and fields. | Error shown; modal stays open; entered data remains for correction; no stale list update. | Medium |

---

## Coverage Matrix (AC -> Test Cases)

| AC scenario | Covered by |
|---|---|
| Whitespace-only rejected on **Create** | `TC-005` |
| Whitespace-only rejected on **Edit** | cross-ref → `DS-2 TC-010` |
| Special characters accepted on **Create** | `TC-001` |
| Special characters accepted on **Edit** | cross-ref → `DS-2 TC-022` |
| Duplicate rejected on **Create** | `TC-006` |
| Duplicate rejected on **Edit** | cross-ref → `DS-2 TC-011` |

---

## Ambiguities / Gaps in ACs

- Duplicate matching rule is unclear: **case sensitivity** (`web development 2026` vs `Web Development 2026`) not specified.
- Unicode normalization not defined (accent variants, en-dash vs hyphen, composed/decomposed characters).
- Client-side max-length behavior is unspecified (hard limit in UI vs server-only rejection).
- Error message content/placement is not specified (inline field error, toast, banner, exact text).
- `Create` button naming is inconsistent (`Create` vs `Save`) in provided behaviors.
- Edit duplicate scenario wording says "edit a program with the same name" but not whether keeping **its own unchanged current name** should be allowed (typically should pass).
- Refresh behavior is marked critical for delete; delete workflow details (modal, API error behavior) are covered in the dedicated Delete Program plan, not duplicated here.
- No explicit non-functional criteria (latency SLA for "immediately reflects", retry policy, concurrency conflict handling).
