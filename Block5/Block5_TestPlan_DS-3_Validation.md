# Test Plan: DS-3 — Program name validation and duplicate prevention

**Source:** [DS-3 — Program name validation and duplicate prevention](https://legionqaschool.atlassian.net/browse/DS-3) (Story, Project: Didaxis Studio, Status: In Progress)

**User story:** As an admin user, I want the system to prevent invalid or duplicate program names so that data integrity is maintained.

## Acceptance Criteria (from Jira DS-3)

```gherkin
Scenario: Reject program name with only whitespace
  Given I am on the program creation form
  When I enter "   " as the program name
  And I click Create
  Then the form is not submitted (name is trimmed, treated as empty)

Scenario: Accept program name with special characters
  Given I am on the program creation form
  When I enter "Informatique & IA - Niveau 2" as the program name
  And I fill other required fields
  And I click Create
  Then the program is created successfully

Scenario: Reject duplicate program name
  Given a program "Web Development 2026" already exists
  When I try to create a new program with the same name
  Then I see an error indicating the name already exists
```

**AC coverage map:** AC1 (whitespace-only) → TC-005, TC-006, TC-007; AC2 (special chars) → TC-001, TC-002, TC-003, TC-004; AC3 (duplicate prevention) → TC-008, TC-009, TC-010, TC-011, TC-012, TC-013.

> **Note on test data:** all admin-created rows use the prefix `I.G.` to keep author-generated programs distinguishable from product seed data. The Jira AC literals (`Web Development 2026`, `Informatique & IA - Niveau 2`) are quoted verbatim where the AC is the contract under test (TC-001, TC-008).
>
> **Note on cross-ticket impact:** DS-3 resolves three ambiguities previously flagged in `Block5_TestPlan_DS-1.md` (whitespace handling, allowed special characters, duplicate-name policy). It also implies a tightening for `Block5_TestPlan_DS-2.md` TC-019 (Edit-to-existing-name) — see ambiguity #1 below.

---

## Positive flows

| TC ID | Title (expected behavior) | Preconditions | Steps | Expected result | Priority |
|-------|---------------------------|---------------|-------|-----------------|----------|
| TC-001 | Name with allowed special characters is accepted (AC2 verbatim) | Logged in as admin at `https://test.didaxis.studio`. On `/programs`. **+ New Program** modal open. No program named `Informatique & IA - Niveau 2` exists. | 1. Type Program Name `Informatique & IA - Niveau 2`.<br>2. Type Description `I.G. ${timestamp}`.<br>3. Click **Create**. | Modal closes. Row **Informatique & IA - Niveau 2** appears in the list **without manual refresh**. The ampersand, accented `é`/`A`, dash, and digits all render exactly as typed (no HTML-encoded entities like `&amp;`). | High |
| TC-002 | Name with smart quotes, apostrophe, and accented Unicode is accepted | Admin. Modal open. | 1. Program Name `I.G. Renée's "Accelerated" 2026 ${timestamp}`.<br>2. Description `I.G. unicode positive`.<br>3. Click **Create**. | Modal closes. Row displays the apostrophe, smart quotes, and accented characters byte-for-byte. Re-opening edit (per DS-2) shows the same characters. | Medium |
| TC-003 | Internal whitespace inside a name is preserved; only edges are trimmed | Admin. Modal open. | 1. Program Name `   I.G. Trim Edges Only ${timestamp}   ` (3 spaces leading and trailing; double-space inside).<br>2. Description `I.G. trim`.<br>3. Click **Create**. | Modal closes. Row name is exactly `I.G. Trim Edges Only ${timestamp}` (leading/trailing spaces stripped, internal double-space preserved). AC1 says "name is trimmed". | High |
| TC-004 | Names with mixed case, digits, and punctuation all create successfully | Admin. Modal open. | 1. Program Name `I.G. CS-101 / 2026 (Cohort #2) ${timestamp}`.<br>2. Description `I.G. mixed`.<br>3. Click **Create**. | Modal closes. Row appears with the exact mixed-case + digit + punctuation string. | Medium |

---

## Negative flows

| TC ID | Title (expected behavior) | Preconditions | Steps | Expected result | Priority |
|-------|---------------------------|---------------|-------|-----------------|----------|
| TC-005 | Whitespace-only name (3 spaces) is rejected — form not submitted (AC1 verbatim) | Admin. **+ New Program** modal open. | 1. Type `   ` (exactly three spaces) into Program Name.<br>2. Fill any valid Description.<br>3. Click **Create**. | Form does **not** submit: either **Create** is disabled, **or** clicking does nothing / shows a validation message. Modal stays open. No `POST /programs` request fires. No row named `"   "` (or `""`) ever appears in the list. AC1's wording — "name is trimmed, treated as empty" — must be satisfied. | High |
| TC-006 | Completely empty name is rejected (DS-1 AC3 cross-coverage) | Admin. Modal open. | 1. Leave **Program Name** empty.<br>2. Inspect **Create**. | **Create** is disabled. Pressing **Enter** does not submit. Same expected outcome as TC-005 — empty and whitespace-only must converge to the same UX. | High |
| TC-007 | Tabs / newlines / non-breaking-space whitespace are also treated as empty | Admin. Modal open. | 1. Paste `\t \u00A0\n` (mix of tab, space, NBSP, newline) into Program Name.<br>2. Click **Create** if enabled. | Treated as whitespace-only. Same behavior as TC-005. No row created. *(See ambiguity #3 if NBSP / Unicode whitespace is not part of the trim.)* | Medium |
| TC-008 | Creating a second program with an existing name is rejected (AC3 verbatim) | Admin. A program named exactly `I.G. Web Development 2026` already exists (created via DS-1 TC-002). Modal open. | 1. Type Program Name `I.G. Web Development 2026`.<br>2. Type Description `I.G. duplicate try`.<br>3. Click **Create**. | An error is displayed indicating the name already exists (e.g. inline under the field, or as a banner/toast — see ambiguity #6). Modal stays open with the entered values preserved. List still contains exactly **one** row with that name. | High |
| TC-009 | Duplicate detection ignores leading/trailing whitespace in the new entry | Admin. `I.G. Web Development 2026` already exists. Modal open. | 1. Type `   I.G. Web Development 2026   ` (with leading + trailing spaces).<br>2. Click **Create**. | After trim, the candidate matches the existing name → duplicate error shown (consistent with TC-008). No second row is created. | High |
| TC-010 | Duplicate detection across letter case | Admin. `I.G. Web Development 2026` already exists. Modal open. | 1. Type `i.g. web development 2026` (all lowercase).<br>2. Click **Create**. | Per product policy: either **case-insensitive** match → duplicate error (preferred for human-name uniqueness), **or** **case-sensitive** match → save succeeds. The UI must clearly reflect whichever policy is in force. *(See ambiguity #2.)* | Medium |
| TC-011 | Duplicate check rejects a re-create after delete only if the policy disallows reuse | Admin. Create `I.G. Reusable ${timestamp}`, then delete it via the DS-4 flow. Modal open again. | 1. Type Program Name `I.G. Reusable ${timestamp}` (same string).<br>2. Click **Create**. | Per product policy: either the name is **reusable** after delete (most likely — duplicate check is over **active** programs only) → row is created, **or** soft-deleted programs still occupy the namespace → duplicate error. *(See ambiguity #4.)* | Medium |
| TC-012 | Error copy for duplicate is human-readable and field-scoped | Admin. `I.G. Web Development 2026` exists. Modal open. | 1. Trigger duplicate error per TC-008.<br>2. Inspect the error UI. | Error text mentions the name and indicates uniqueness (e.g. "Program name already exists" or similar). Error is associated with the **Program Name** field (`aria-describedby` / `role="alert"`). Not a generic 500 page. | Medium |
| TC-013 | After a duplicate error, fixing the name and re-clicking Create succeeds | Admin. Just hit duplicate error per TC-008. Modal still open with the duplicate name and original Description. | 1. Edit Program Name to `I.G. Web Development 2026 - Cohort B ${timestamp}`.<br>2. Click **Create** again. | Modal closes. New row appears in the list. The Description value entered before the error is **preserved** through the retry (no data loss). Duplicate error message clears once the field becomes valid. | High |
| TC-014 | Race: two clients create the same name nearly simultaneously | Two admin sessions A and B. Neither program with name `I.G. Race ${timestamp}` exists. | 1. In A, fill Program Name `I.G. Race ${timestamp}` and click **Create**.<br>2. In B, before A's response returns, fill the same Program Name and click **Create**. | Server-side uniqueness must prevent both: exactly **one** row is created. The losing client receives the duplicate error from TC-008. *(If both succeed, this contradicts AC3 and is a defect.)* | Medium |

---

## Edge cases

| TC ID | Title (expected behavior) | Preconditions | Steps | Expected result | Priority |
|-------|---------------------------|---------------|-------|-----------------|----------|
| TC-015 | RTL Unicode (Arabic / Hebrew) is accepted and preserved | Admin. Modal open. | 1. Program Name `I.G. برنامج تجريبي ${timestamp}`.<br>2. Description `I.G. rtl`.<br>3. Click **Create**. | Row is created. Display shows the RTL characters in correct direction. Bytes round-trip on re-open (per DS-2 TC-002 contract). | Low |
| TC-016 | Emoji and supplementary-plane Unicode are accepted | Admin. Modal open. | 1. Program Name `I.G. 🎓 Cohort 2026 ${timestamp}`.<br>2. Description `I.G. emoji`.<br>3. Click **Create**. | Row is created with the emoji preserved exactly. List rendering does not truncate or replace the emoji with `?`/`?`. | Low |
| TC-017 | Combining-character vs precomposed Unicode is treated consistently for duplicates | Admin. `I.G. Renée ${timestamp}` (precomposed `é`) already exists. Modal open. | 1. Type the same name using `e` + combining acute accent (`U+0065 U+0301`) instead of precomposed `é`.<br>2. Click **Create**. | Per product policy: either both forms are **NFC-normalized** before comparison → duplicate error (preferred for user-perceivable equality), **or** treated as different bytes → row is created. *(See ambiguity #5.)* | Low |
| TC-018 | Invisible / zero-width characters do not bypass duplicate detection | Admin. `I.G. Web Development 2026` already exists. Modal open. | 1. Type `I.G. Web` + ZWSP (`U+200B`) + ` Development 2026`.<br>2. Click **Create**. | Per product policy: either the name is **stripped of invisible chars** before compare → duplicate error, **or** it's accepted as a distinct name. The latter is a soft data-integrity risk; document the chosen behavior. | Medium |
| TC-019 | HTML-like text in the name is stored as text and is **not** treated as a duplicate of any literal HTML rendering | Admin. Modal open. | 1. Program Name `I.G. <img src=x onerror=alert(1)> ${timestamp}`.<br>2. Description `I.G. xss safety`.<br>3. Click **Create**. | No JS dialog/alert fires. Row is added with the literal text shown escaped (no rendered image, no script execution). Cross-references DS-1 TC-013. | High |
| TC-020 | Very long valid name (255 chars) with allowed special chars persists | Admin. Modal open. | 1. Program Name `I.G. ` + `é-1` repeated to fill 255 chars total (mix of accent + dash + digit).<br>2. Description `I.G. long-special`.<br>3. Click **Create**. | Row is created. Long name is rendered without breaking layout (truncation/ellipsis OK per UI). Duplicate of this exact long name on a second attempt is rejected. | Medium |
| TC-021 | Duplicate detection on **Edit** when renaming to an existing program (cross-cuts DS-2) | Admin. Two programs exist: `I.G. Existing A` and `I.G. Existing B`. Open **Edit** on `I.G. Existing B` (per DS-2 flow). | 1. Change Program Name to `I.G. Existing A`.<br>2. Click **Save**. | Per DS-3's data-integrity intent: Save should be rejected with a duplicate error consistent with TC-008. *(DS-3's ACs only mention "create a new program"; see ambiguity #1.)* | High |
| TC-022 | Whitespace-only name on **Edit** is rejected (cross-cuts DS-2) | Admin. Edit modal open on any I.G.-prefixed program. | 1. Replace Program Name with `   ` (three spaces).<br>2. Click **Save**. | Save is rejected (button disabled, or validation error). Original program name remains unchanged in the list. Same UX as TC-005, applied to the Edit flow. | High |

---

## Ambiguities or gaps in the ACs

1. **Scope: Create only or also Edit?** — AC3 talks about "create a new program", and AC1 mentions "the program creation form". DS-3 does not explicitly cover the Edit flow. TC-021 and TC-022 assume the same rules apply on Edit (which is the only data-integrity-preserving choice); confirm with PM. This also resolves Block 5 DS-2 TC-019, which currently leaves the duplicate-on-edit policy open.
2. **Case sensitivity of duplicate check** — TC-010 lists both possibilities. Human-readable program names usually merit a case-insensitive match (NFKC + casefold), but AC3 doesn't say. PM/UX confirmation needed.
3. **Whitespace definition for trim** — AC1 says "trimmed" but doesn't define which characters are stripped. ASCII space is obvious; tab, NBSP (`U+00A0`), zero-width space (`U+200B`), and other Unicode whitespace are unclear (TC-007, TC-018).
4. **Soft-delete name reuse** — TC-011 lists both policies. Most products free the name on delete; some keep it reserved (e.g. for audit). Not specified.
5. **Unicode normalization** — TC-017 requires the system to NFC-normalize before comparison if the duplicate check is to feel correct to users. AC3 is silent.
6. **Error message format** — TC-012 covers the basics, but exact copy, placement (inline vs banner vs toast), persistence, and dismissal are not specified.
7. **Length bounds** — DS-3 doesn't specify min or max. The Block 4 DS-2 plan (which had richer source material) asserted **max 100 chars**; DS-1's plan and TC-020 use **255**. These contradict and need a single source of truth.
8. **Cross-tenant uniqueness scope** — "Already exists" is presumably scoped to the current organization/tenant, not globally; not stated.
9. **Server-vs-client enforcement strategy** — AC1 says "form is not submitted" (client-side block), AC3 implies an after-submit error (server-side check). The mix is reasonable, but the exact contract (which checks happen where) is not defined.
10. **Allowed special characters** — AC2 picks one example (`& - é digits`). It does not enumerate disallowed characters (e.g. control chars `U+0000`–`U+001F`, line breaks). TC-019 ensures HTML-like text is treated as plain text (covers XSS), but a positive allow-list / negative deny-list spec would be safer.
11. **Concurrent creates** — TC-014 assumes server-side uniqueness wins. Not stated whether the duplicate check is enforced by a DB unique index (race-safe) or only at the application layer (race-prone).

---

## Re-evaluation against ACs

- **AC1** ("Reject program name with only whitespace") — fully covered by **TC-005** (verbatim 3-spaces), with extensions in **TC-006** (empty equivalence), **TC-007** (other whitespace), and **TC-022** (Edit flow).
- **AC2** ("Accept program name with special characters") — fully covered by **TC-001** (verbatim AC string), **TC-002** (Unicode + smart quotes), **TC-003** (trim semantics), **TC-004** (mixed case + digits + punctuation).
- **AC3** ("Reject duplicate program name") — fully covered by **TC-008** (verbatim name `Web Development 2026`), with extensions in **TC-009** (post-trim match), **TC-010** (case sensitivity), **TC-011** (post-delete reuse), **TC-012** (error UX), **TC-013** (recoverable error), **TC-014** (race), **TC-021** (Edit flow rename).
- **Edge** coverage adds: RTL (TC-015), emoji (TC-016), combining-vs-precomposed normalization (TC-017), zero-width invisibles (TC-018), HTML safety (TC-019), long names with special chars (TC-020).

All three Jira ACs have at least one positive and one negative test case anchored on the verbatim AC strings; common edge behaviors and the cross-flow Edit implication are covered; explicit gaps in the ACs are listed above for product/PM follow-up.

---

## Cross-ticket reconciliation (impact on existing Block 5 plans)

| Existing assumption | DS-3 says | Action |
|---|---|---|
| `Block5_TestPlan_DS-1.md` ambiguity #1 (whitespace, min/max, uniqueness) | Whitespace = empty; uniqueness enforced | Tighten DS-1 TC-007 expected result to mirror TC-005; remove "if Create disabled" hedge |
| `Block5_TestPlan_DS-1.md` TC-014 ("Duplicate Program Names are allowed") | Duplicates rejected | TC-014 should now expect the duplicate error and **must** be flipped from positive (allowed) to negative (rejected) — or removed in favor of DS-3 TC-008 |
| `Block5_TestPlan_DS-1.md` TC-013 ("HTML-like text") | XSS safety still implicit; AC2 lists allowed chars by example only | Keep as-is; cross-link to DS-3 TC-019 |
| `Block5_TestPlan_DS-2.md` TC-019 ("Edit to existing name — could go either way") | Should be rejected (TC-021 in this plan) | Tighten DS-2 TC-019 expected result to "duplicate error, modal stays open"; mark DS-3 as the source-of-truth ticket |
