# Test Plan: DS-5 — Program list filtering and display

**Source:** [DS-5 — Program list filtering and display](https://legionqaschool.atlassian.net/browse/DS-5) (Story, Project: Didaxis Studio, Status: In Progress)

**User story:** As an admin user, I want to see all programs in a clear list so that I can quickly find and manage them.

## Acceptance Criteria (from Jira DS-5)

```gherkin
Scenario: Display program list with key details
  Given programs exist in the system
  When I navigate to the Programs page
  Then I see a list showing each program's name and description

Scenario: Empty state when no programs exist
  Given no programs exist
  When I navigate to the Programs page
  Then I see a message indicating no programs have been created
  And I see a prompt to create the first program
```

**AC coverage map:** AC1 (display name + description) → TC-001, TC-002, TC-003; AC2 (empty state with CTA) → TC-004, TC-005, TC-006.

> **Note on the ticket title vs. ACs:** the Jira summary says **"filtering and display"**, but neither AC defines filter / search / sort / pagination behavior. This plan covers only **display** and **empty state** as written. Any filter / search work is not testable from the current ACs and is listed as ambiguity #1.
>
> **Note on test data:** all admin-created rows use the prefix `I.G.` to keep author-generated programs distinguishable from product seed data.

---

## Positive flows

| TC ID | Title (expected behavior) | Preconditions | Steps | Expected result | Priority |
|-------|---------------------------|---------------|-------|-----------------|----------|
| TC-001 | Programs page renders a list with each program's **name** and **description** (AC1 verbatim) | Logged in as admin at `https://test.didaxis.studio`. At least one program exists (seed or admin-created). | 1. Navigate to **Programs** (`/programs`).<br>2. Wait for the list to render. | A program list is visible. For each program row, both the **program name** and the **description** are present in the row's primary cell (or its equivalent semantic location). No row hides the description (other than the legitimate empty-description case in TC-018). | High |
| TC-002 | A program created in the same session appears in the list (cross-cuts DS-1 AC2) | Admin. A program `I.G. Display Smoke ${timestamp}` with description `I.G. desc smoke` was just created via the DS-1 Create flow. | 1. Verify the **+ New Program** modal closed (per DS-1 TC-003).<br>2. Inspect the programs list. | A row exactly named `I.G. Display Smoke ${timestamp}` is present, with description `I.G. desc smoke` in its row. The new row is reachable without a manual page reload (re-fetch on mutation). | High |
| TC-003 | Multiple programs render side-by-side without overlap | Admin. Programs `I.G. Multi A ${timestamp}`, `I.G. Multi B ${timestamp}`, and `I.G. Multi C ${timestamp}` exist (each with a distinct description). | 1. Navigate to **Programs**.<br>2. Inspect the rows. | All three rows are visible. Each shows its own name and description. No row's content bleeds into another. List ordering is consistent within the page (see ambiguity #2 for ordering rules). | High |
| TC-004 | Empty state shows a "no programs yet" message and a create prompt (AC2 verbatim) | Logged in as admin in a tenant / view that has **zero** programs visible (see ambiguity #11 for visibility scope). | 1. Navigate to **Programs**. | The page shows: (a) a message that **no programs have been created** (exact copy is product-specific — see ambiguity #4); (b) a **prompt to create the first program** — i.e. an actionable affordance such as a button labeled `+ New Program`, `Create Program`, or similar. No program list is rendered. | High |
| TC-005 | Deleting the last program triggers the empty state (cross-cuts DS-4 TC-015) | Admin. Exactly one program `I.G. Solo ${timestamp}` exists. | 1. Delete `I.G. Solo ${timestamp}` via the DS-4 confirm flow. | After the delete completes (no manual refresh), the page transitions from showing the single row to showing the empty state per AC2 — same state asserted in TC-004. | Medium |
| TC-006 | Creating the first program from the empty state replaces the empty state with the list | Admin. Empty state visible per TC-004. | 1. Click the **create** prompt on the empty state.<br>2. Fill the **+ New Program** modal with name `I.G. First ${timestamp}` and description `I.G. desc`.<br>3. Click **Create**. | The empty state disappears. The list now shows exactly one row with name `I.G. First ${timestamp}` and description `I.G. desc`. | Medium |

---

## Negative flows

| TC ID | Title (expected behavior) | Preconditions | Steps | Expected result | Priority |
|-------|---------------------------|---------------|-------|-----------------|----------|
| TC-007 | Server failure (5xx) when loading the list shows an error state, not a blank or fake-empty state | Admin. Force/mock `GET /programs` (or equivalent) to return **500**. | 1. Navigate to **Programs**.<br>2. Wait for the request to fail. | An **error** state is shown (toast / inline banner / dedicated error UI — see ambiguity #7). The empty-state UI from AC2 is **not** shown (a 500 must not be misrepresented as "no programs yet"). The user has a way to retry. | High |
| TC-008 | Slow / pending request shows a clear loading state, not a flash of empty state | Admin. Throttle the network so `GET /programs` takes several seconds. | 1. Navigate to **Programs**. | While the request is pending, a loading indicator (spinner / skeleton / placeholder) is shown — **not** the empty state from AC2. Once the response arrives, the list renders. | Medium |
| TC-009 | Non-admin user sees the appropriate restricted view | Logged in as a non-admin (e.g. `qa-viewer@school.edu`). | 1. Navigate to **Programs**. | Per product policy: either the page renders a **read-only list** (no edit / delete / create controls visible — see ambiguity #9), **or** the page returns a **403** / redirect to a "no access" view. The chosen behavior must be consistent with DS-1, DS-2, DS-4 role-gating expectations. | High |
| TC-010 | Unauthenticated access to `/programs` redirects to login | Logged out (no session cookie). | 1. Open `/programs` directly in the browser. | The user is redirected to `/login` (or the configured auth route). The empty state is **not** shown to an unauthenticated user — the empty state is only valid in an authenticated context (AC2's "Given no programs exist" assumes the user is signed in). | Medium |

---

## Edge cases

| TC ID | Title (expected behavior) | Preconditions | Steps | Expected result | Priority |
|-------|---------------------------|---------------|-------|-----------------|----------|
| TC-011 | Long names and descriptions are truncated or wrapped without breaking layout | Admin. Programs exist with: (a) a 255-char name (per DS-1 TC-011), (b) a 1000-char description (per DS-1 TC-015). | 1. Navigate to **Programs**.<br>2. Inspect both rows. | Each row's name and description fit within their cell (truncation with ellipsis, multi-line wrap, or hover-to-expand are all acceptable per UI). No row pushes the table off-screen, overlaps controls, or hides delete / edit affordances. | Medium |
| TC-012 | Unicode and special characters render correctly in both name and description | Admin. Program `I.G. Renée's "Accelerated" Program ${timestamp}` with description `I.G. Café & React <2026>`. | 1. Navigate to **Programs**.<br>2. Locate the row. | Apostrophe, smart quotes, accented `é`/`A`, ampersand, and angle-bracket text all render exactly as stored (no HTML-encoded `&amp;`, no mojibake). | Medium |
| TC-013 | HTML-like text in name or description is rendered as plain text in the list (no XSS) | Admin. Program with name `I.G. <img src=x onerror=alert(1)> ${timestamp}` and description `<script>alert(2)</script>`. | 1. Navigate to **Programs**.<br>2. Wait for the list to render. | No JS dialog / alert fires from rendering the list. The text appears escaped in the row (no rendered `<img>`, no executed `<script>`). Pairs with DS-1 TC-013 (Create) and DS-2 TC-017 (Edit). | High |
| TC-014 | Programs with empty / missing description display gracefully | Admin. Program `I.G. NoDesc ${timestamp}` exists with an **empty** description (per DS-1 TC-005, if optional) **or** with a NULL description if seeded directly. | 1. Navigate to **Programs**.<br>2. Find the row. | Row renders without breaking layout. Description column is empty / shows a placeholder (e.g. em-dash, italic "No description") — see ambiguity #6. The row remains operable: edit / delete controls still work. | Medium |
| TC-015 | An edit reflects in the list immediately (cross-cuts DS-2 AC2) | Admin. Program `I.G. To Rename ${timestamp}` exists. | 1. Edit the program (per DS-2) and rename to `I.G. To Rename ${timestamp} - Updated`.<br>2. Save and observe the list. | The list shows the new name / description without manual refresh; the previous name no longer appears. (DS-2 TC-003 already asserts this; restated here from the list's perspective.) | Medium |
| TC-016 | A delete removes the row from the list immediately (cross-cuts DS-4 AC1) | Admin. Program `I.G. To Delete ${timestamp}` exists. | 1. Delete the program (per DS-4) and confirm.<br>2. Observe the list. | Row disappears without manual refresh; list re-fetches; no "ghost" row. (DS-4 TC-002 already asserts this; restated here from the list's perspective.) | Medium |
| TC-017 | Many programs (50+) render without performance regressions | Admin. 50+ programs visible (mix of seed + I.G. rows). | 1. Navigate to **Programs**.<br>2. Scroll the list. | The list renders within an acceptable budget (subjective — see ambiguity #12). Scrolling stays smooth; no excessive lag, no missing rows. If virtualization is in use, scrolling reveals each row correctly without skipped indexes. | Low |
| TC-018 | List ordering is consistent across reloads | Admin. ≥3 programs exist with deterministic creation order. | 1. Navigate to **Programs** and record the row order.<br>2. Hard-reload the page.<br>3. Compare orders. | The order is the same on both loads, **or** the difference is explained by a deterministic rule (e.g. alphabetical, last-modified). The order does not change randomly between page loads (see ambiguity #2). | Medium |
| TC-019 | List reflects rows created in a different session after re-fetch | Two admin sessions A and B sharing the same tenant. | 1. In B, create program `I.G. Cross Session ${timestamp}`.<br>2. In A, navigate away from **Programs** and back (or trigger re-fetch). | A's list now includes the row created in B. Real-time push is not required (see ambiguity #10), but a navigation-triggered re-fetch must show the new state. | Low |
| TC-020 | List does not include a soft-deleted program | Admin. Program `I.G. Deleted ${timestamp}` was deleted via DS-4. | 1. Navigate to **Programs** (re-fetch). | No row matching the deleted name is returned (regardless of whether the underlying store soft-deletes or hard-deletes the record). The display is over **active** programs only. Pairs with DS-3 TC-011 (post-delete name reuse) and DS-4 TC-021. | Medium |

---

## Ambiguities or gaps in the ACs

1. **Filtering / search / sort / pagination** — The Jira summary says "filtering and display", but **no AC** defines a filter input, search box, sort controls, or pagination. If those features exist in the implementation, DS-5 does not cover them — they need a separate ticket or expanded ACs before they can be tested against contract.
2. **Default list ordering** — Not specified. Common options: alphabetical by name, reverse-creation-order (newest first), last-modified-first, or insertion order. TC-003 and TC-018 only assert consistency, not a specific rule.
3. **Other displayed fields** — AC1 says only "name and description". The actual UI shows a **🗑** delete icon (per DS-4) and presumably an edit affordance (per DS-2). These exist as siblings to the AC1 fields but are not part of DS-5's contract.
4. **Empty-state copy and visuals** — AC2 only requires "a message" and "a prompt to create". The exact copy / icon / button label are product-specific. The Block 4 plan for DS-4 (`Block4/Block2_DS-4_tplan_Delete.md` TC-005) asserts the literal string `🎓 No programs yet. Create your first program to get started.` and a button labeled `Create Program` — that detail is not in DS-5's ACs.
5. **CTA destination** — AC2 says a "prompt to create" appears, but does not say whether clicking it opens the same `+ New Program` modal as DS-1 or routes elsewhere. TC-006 assumes the same modal.
6. **Empty-description display** — Not specified. TC-014 documents that the row must render without breaking; the exact placeholder treatment is open.
7. **Error state UX** — TC-007 assumes a graceful error state distinct from the empty state. AC says nothing about failure handling.
8. **Loading state UX** — TC-008 assumes a loading indicator instead of a brief flash of empty state. AC says nothing about the pending state.
9. **Role gating** — Same gap as DS-1, DS-2, DS-3, DS-4: non-admin behavior on this page is not defined.
10. **Real-time updates / live propagation** — TC-019 only requires a re-fetch on navigation. Whether the list updates live (websocket, polling) when another admin creates/edits/deletes is not specified.
11. **Visibility scope** — "no programs exist" in AC2 is presumably scoped to the **current tenant / admin's view**, not globally. Multi-tenant isolation, per-org filtering, and per-user assignment scopes are not defined.
12. **Performance and virtualization** — TC-017 uses "performant" without an explicit budget. No SLA on render time, list size limit, or virtualization requirement.
13. **Accessibility** — No AC for table semantics, header roles, sort announcement, keyboard reach for row controls, or screen-reader treatment of the empty state.

---

## Re-evaluation against ACs

- **AC1** ("Display program list with key details") — fully covered by **TC-001** (verbatim list with name + description), **TC-002** (just-created program is present), **TC-003** (multiple programs render correctly).
- **AC2** ("Empty state when no programs exist") — fully covered by **TC-004** (verbatim empty state with message and create prompt), **TC-005** (last-delete transition), **TC-006** (create-from-empty-state replaces the empty state).
- **Negative coverage** adds: 5xx error state distinct from empty state (TC-007), loading state distinct from empty state (TC-008), non-admin role gating (TC-009), unauthenticated redirect (TC-010).
- **Edge coverage** adds: long-name / long-description layout (TC-011), Unicode (TC-012), XSS-safe rendering in the list (TC-013), empty-description rendering (TC-014), edit reflected in list (TC-015), delete removed from list (TC-016), 50+ rows (TC-017), ordering consistency (TC-018), cross-session re-fetch (TC-019), deleted programs absent (TC-020).

Both Jira ACs have at least one positive test case anchored on the verbatim AC strings; the major negative and edge behaviors are covered; explicit gaps (especially the missing filter / search / sort / pagination contract implied by the ticket title) are listed above for product/PM follow-up.

---

## Cross-ticket reconciliation (relationships to other Block 5 plans)

| Topic | Owner ticket | DS-5's coverage | Notes |
|---|---|---|---|
| New program appears in list after Create | DS-1 AC2 (`Block5_TestPlan_DS-1.md` TC-002) | TC-002, TC-006 | DS-5 verifies the list-side observable; DS-1 owns the create contract. |
| Edited program reflected in list | DS-2 AC2 (`Block5_TestPlan_DS-2.md` TC-003) | TC-015 | Restated from list's perspective. |
| Deleted program removed from list | DS-4 AC1 (`Block5_TestPlan_DS-4.md` TC-002, TC-021) | TC-005, TC-016, TC-020 | DS-5 owns the empty-state transition (TC-005); DS-4 owns the delete contract. |
| Empty-state copy / CTA detail | Block 4 plan for DS-4 (TC-005) | TC-004 (loose), ambiguity #4 | Block 4 asserts literal `🎓 No programs yet. …` text. DS-5's AC does not — flagged as ambiguity. |
| Post-delete name absence | DS-3 ambiguity #4 + DS-4 TC-017 | TC-020 | DS-3 owns the policy decision; DS-5 only verifies the list reflects the post-delete state. |
| XSS safety on render | DS-1 TC-013 (Create), DS-2 TC-017 (Edit) | TC-013 | Same expectation, applied at the list-render layer. |
| Role gating | All four prior plans flag this | TC-009 | Same gap; should be resolved once at the product level. |
| Filtering / search / sort / pagination | None — implied by DS-5 title only | n/a (ambiguity #1) | Needs a separate ticket or expanded DS-5 ACs before any test can claim coverage. |
