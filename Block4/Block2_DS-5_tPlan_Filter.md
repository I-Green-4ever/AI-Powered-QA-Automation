# Test Plan: Program list filtering and display

**Feature:** As an admin, I see all programs in a clear list so I can quickly find and manage them.  
**Primary scope:** **`/programs`** — header, **Programs** table (program **Name** + **Description** preview), row actions (**edit**, **delete**), **`+ New Program`** (**ADMIN**, **EDITOR**), semester panel on row selection.

---

## 1. Positive flows

| ID | Title | Preconditions | Steps | Expected result | Priority |
|----|--------|---------------|-------|-----------------|----------|
| **TC-001** | Programs page shows each program’s **Program Name** and **Description** (or preview) | At least two programs exist, e.g. **Web Development 2026** with a non-empty **Description**, and **UX Design Basics** with a non-empty **Description**. Logged in as **ADMIN**. | 1. Navigate to `https://<app-host>/programs`. | Page loads. The program list/table includes a row for **Web Development 2026** and a row for **UX Design Basics**. Each visible row shows that program’s **Program Name** and a **Description** preview/text derived from saved **Description** (consistent with backend). Semester panel opening is optional for this assertion. | High |
| **TC-002** | Empty state messaging and first-program prompt when the organization has zero programs | **No** programs exist for the tenant/organization under test (no rows after delete-all or fresh org). User can access Programs. Logged in as **ADMIN**. | 1. Open `/programs`. | User sees messaging that clearly states **no programs have been created** (or equivalent). User sees an explicit prompt or control path to **create the first program** (e.g. **`+ New Program`** and/or embedded CTA in empty state — match implemented UI copy). Table shows **no** misleading placeholder rows. | High |
| **TC-003** | **`+ New Program`** is visible to **ADMIN** on the Programs page | Logged in as **ADMIN**. | 1. Open `/programs`. | Header shows title **Programs** (or documented product variant) and **`+ New Program`** is **visible** and actionable (not hidden by layout). | High |
| **TC-004** | **`+ New Program`** is visible to **EDITOR** on the Programs page | Logged in as **EDITOR** (non-admin permitted to create per spec). Programs may or may not exist. | 1. Open `/programs`. | **`+ New Program`** is **visible**. | Medium |
| **TC-005** | Table lists **edit** and **delete** actions for each program row | At least program **Web Development 2026** exists. User has rights to manage programs per product rules (typically **ADMIN**). | 1. Open `/programs`. 2. Locate row **Web Development 2026**. | Row shows edit (✏️) and delete (🗑 or equivalent) action affordances consistent with UI spec. Icons are reachable by keyboard/tab order if WCAG applies. | Medium |
| **TC-006** | Clicking a program row opens the **Semester** panel with semesters (and holidays/breaks as applicable) | Program **Web Development 2026** exists and has linked semester metadata (≥1 semester) with known holiday/break fixtures if seeded. Logged in as **ADMIN**. | 1. Open `/programs`. 2. Click the row **Web Development 2026** (not the action icons unless row selection is exclusively via row click). | Semester panel appears **to the right** (or documented placement). Panel lists expected semester(s); holidays and breaks sections match configured data or show purposeful empty subsection states. | Medium |
| **TC-007** | Creating a program from empty state refreshes list to show **Name** and **Description** | Empty org (**TC-002** precondition). **ADMIN**. | 1. Open `/programs`. 2. Use **`+ New Program`**. 3. Create **Data Science Intensive 2026** with **Program Name** `Data Science Intensive 2026`, **Description** `Foundations cohort for spring intake.` 4. Complete create flow successfully. | Empty state disappears. Table row appears with **`Data Science Intensive 2026`** and description preview/content matching saved **Description**. | High |
| **TC-008** | After externally adding a program (or second tab create), navigating to `/programs` shows up-to-date list | Reliable way to insert a row (API/admin tool) exists; baseline list known. **ADMIN**. | 1. Add program **`Mobile Dev Evening`** with **`Evening cohort – mobile.`** outside current tab. 2. Open `/programs` (fresh load). | **`Mobile Dev Evening`** appears with expected **Description** preview. | Medium |

---

## 2. Negative flows

| ID | Title | Preconditions | Steps | Expected result | Priority |
|----|--------|---------------|-------|-----------------|----------|
| **TC-009** | Unauthorized or non-privileged roles must **not** receive **`+ New Program`** / **delete** when product RBAC forbids | A role exists that may view programs but **must not** see **`+ New Program`** **or** must not see **delete** (define per RBAC matrix — example: read-only reviewer). Fixtures: ≥1 program. | 1. Log in as the restricted role. 2. Open `/programs`. | **`+ New Program`** hidden **or** non-functional per spec **and/or** destructive actions unavailable. No server error masking missing permission. Deep link `/programs` does not expose forbidden controls via client-side bypass alone. | High |
| **TC-010** | Program list **must not** show programs from another organization/tenant | Two tenants **A** and **B** exist; Tenant **B** has **`Other Org Program`**. Tester session is Tenant **A** **ADMIN**. | 1. Log in as Tenant **A**. 2. Open `/programs`. | **`Other Org Program`** **never** appears. Only Tenant **A** programs listed. | High |
| **TC-011** | Row click for selection **does not** invoke **edit**/**delete** unintentionally | Program **UX Design Basics** exists. **ADMIN**. | 1. Open `/programs`. 2. Click center of row **UX Design Basics** without clicking icons. | **Edit Program** modal **does not** open; program **does not** delete; semester panel/state updates per design without accidental destructive action. | Medium |
| **TC-012** | Stale UI **must not** show deleted program after successful delete elsewhere | Same user, two browsers/tabs possible; or delete then back navigation. Program **Alpha** exists. **ADMIN**. | 1. Tab **A**: `/programs`. 2. Tab **B**: Delete **Alpha** successfully. 3. Tab **A**: trigger list refresh/navigation consistent with SPA behavior (explicit refresh if required). | **Alpha** disappears after refresh/re-fetch; no phantom row after stable refresh completes. If product auto-refetches, Tab **A** updates without misleading success state. | High |
| **TC-013** | Empty state **must not** imply programs exist when count is zero | Zero programs for org; **ADMIN**. | 1. Open `/programs`. | No table rows labelled as programs. No zero-row table with phantom pagination totals suggesting data. Messaging matches **TC-002**. | Medium |
| **TC-014** | Semester panel **must not** show another program’s semesters after switching selection | Programs **Web Development 2026** and **`Data Science Intensive 2026`** both have different semester titles. **ADMIN**. | 1. Select **Web Development 2026**; note semesters. 2. Select **`Data Science Intensive 2026`**. | Panel content updates wholly to **`Data Science Intensive 2026`** data; no stale labels from prior selection. | Medium |
| **TC-015** | API failure loading programs shows error; list **does not** fabricate success | Simulate `GET /programs` (or equivalent) **500** / network fail for programs list endpoint. **ADMIN**. | 1. Enable failure. 2. Open `/programs`. | Inline error/toast/disabled skeleton per pattern; **no** fake programs; **`+ New Program`** behavior aligns with disabled vs allowed policy (document actual rule). | High |

---

## 3. Edge cases

| ID | Title | Preconditions | Steps | Expected result | Priority |
|----|--------|---------------|-------|-----------------|----------|
| **TC-016** | **Program Name** at **exactly 100** characters renders without breaking table layout | Create program **`N100`** with **Program Name** = `[100-character string]` and **Description** `Boundary name test.` | 1. Open `/programs`. 2. Observe **`N100`** row. | Name shown in full **or** with documented ellipsis + tooltip/accessibility exposes full **100** chars if truncated; layout remains usable. | Medium |
| **TC-017** | **Description** at **exactly 500** characters: preview truncation is coherent | Program **`D500`** with **Program Name** `Description boundary` and **Description** = `[500-character string]`. | 1. Open `/programs`. | Description preview truncated predictably; full **Description** reachable via edit/details path; benign HTML-like text does not execute as script. | Medium |
| **TC-018** | Empty saved **Description** yields coherent row (name visible; layout intact) | Program **`NoDesc`** exists with **Program Name** `No Description Program`, **Description** empty string/`null`. | 1. Open `/programs`. | Row shows **`No Description Program`**. Missing description shows purposeful empty/em dash/“No description”, **not** `undefined`/broken cell; **Program Name** always visible per AC. | High |
| **TC-019** | Special characters and Unicode in **Program Name** / **Description** display correctly | Programs **`Café & React <2026>`** (**Name**) and multi-line/description with quotes where newlines permitted. | 1. Save programs via create/edit. 2. Open `/programs`. | Safe rendering (`&`, `<`, accent); newline behavior per textarea rules; no script injection. | Medium |
| **TC-020** | Two programs with **distinct** identities render; duplicate **names** follow backend uniqueness (**per organization**) | Programs **`Web Front`** and **`Web Front-End`** coexist (valid case). Separate case: attempted duplicate **`UX Design Basics`** rejected at creation—document enforced rule. | 1. Open `/programs` for valid pair. | Both rows coexist with correct previews; ambiguity with duplicate **Name** matches API (typically reject duplicate create). Document observed uniqueness. | Low |
| **TC-021** | Large program count: list usable (pagination/scroll/virtualization) | Seed ≥50–200 programs (scale per env), e.g. **Program-{00001}** … | 1. Open `/programs`. 2. Paginate or scroll entire set. | Page remains usable; **`Web Development 2026`** findable manually **or** via filter/search **if shipped**. | Low |
| **TC-022** | Trimmed **Program Name** displays correctly after save (no misleading padding in list) | Stored **Program Name** is **`Padded Program`** after trim from **`  Padded Program  `**. | 1. Confirm server value. 2. Open `/programs`. | Row shows trimmed **`Padded Program`**; layout not broken by excess spaces. | Low |
| **TC-023** | Semester panel for program with **zero** semesters shows clean empty state | Program **`New Program No Terms`** exists with **zero** semesters. **ADMIN**. | 1. Select row on `/programs`. | Panel empty-state for semesters; holidays/breaks empty gracefully; no infinite spinner. | Medium |
| **TC-024** | Filter/search **if shipped**: no-match query state distinct from organizational empty state (**TC-002**) | Programs exist; filter returns no rows for **`zzzzzzz`**. | 1. Enter **`zzzzzzz`** (or equivalent filter). | “No results” messaging for filtered view; clearing filter restores list. If filtering **does not ship**, mark **N/A** and rely on ambiguity log. | Medium |

---

## 4. Traceability (AC coverage)

| Acceptance scenario | Covered by |
|---------------------|------------|
| List shows each program **name** and **description** | **TC-001**, **TC-017**, **TC-018**, **TC-019** |
| Empty org → message **no programs** + prompt to **create first** | **TC-002**, **TC-007** (cross-ref: **DS-4 TC-005** for delete-driven empty state) |

---

## 5. Ambiguities and gaps in the ACs

1. **“Filtering” in feature title:** AC text only mandates list **display** name/description plus empty state — no documented filter UX (column sort, search, facets).  
2. **Roles:** **ADMIN** vs **EDITOR** vs read-only viewers; **`delete`** for **EDITOR** unspecified.  
3. **Description preview:** Characters/lines before ellipsis; tooltip/full text access; representation when **Description** empty.  
4. **Empty-state copy:** Exact wording not specified; parity between global empty state **`+ New Program`** vs inline CTA.  
5. **Row vs icon clicks:** Interaction model for opening semester panel without triggering edit/delete; keyboard behavior.  
6. **“All prepopulated values deleted”:** Interpreted as deleting **every seeded program** until none remain; the delete-driven empty-state transition is owned by the Delete plan (**DS-4 TC-005**) and not duplicated here. Confirm if alternate meaning (tenant reset, field-level data) applies.  
7. **Unauthorized access** to **`/programs`:** Redirect vs error screen not covered in ACs.  
8. **`Semester` panel:** Read-only vs editing holidays/breaks from panel unspecified in list AC scope.  
9. **List refresh contract** after mutations: Implicit from product UX; AC does not cite timing/loading UX for list **`GET`** failures (**TC-015**).  
10. **`/programs`** title string exact casing/token vs i18n not specified.
