# Test Plan: Delete program with confirmation

Test plan aligned to the flow, ACs, refresh rule, native confirm dialog copy, empty state, and success “confirmation message” wording.

---

## Positive flows

| TC ID | Title (expected behavior) | Preconditions | Steps | Expected result | Priority |
|-------|---------------------------|---------------|-------|-----------------|----------|
| TC-001 | Deleting Test Program succeeds after confirming native dialog | Logged in as admin. Program list shows program **Test Program** (with semesters/courses if applicable). Backend delete succeeds. | 1. Open the programs page.<br>2. Locate row **Test Program**.<br>3. Click the **🗑** delete icon.<br>4. Read the native confirmation dialog.<br>5. Click **OK**. | Dialog text is exactly: Delete program "Test Program"? All its semesters and courses will be removed. This cannot be undone. After OK, delete API runs. **Test Program** disappears from the list **without manual refresh**. Success feedback is shown (**confirmation message**). List matches server (**re-fetch** behavior). | High |
| TC-002 | Cancelling deletion leaves the program unchanged | Logged in as admin. Row **Winter 2026 Program** exists. | 1. Click **🗑** on **Winter 2026 Program**.<br>2. On the dialog, click **Cancel**. | No delete API call (or program still exists if call is unavoidable—**expected**: no destructive effect; row remains). Dialog closes. **Winter 2026 Program** remains in list with same name and data. No success toast/error for delete. | High |
| TC-003 | Confirm delete removes program whose name contains quotes or apostrophe | Admin. Program exists named **Renée's \"Accelerated\" Program**. | 1. Click **🗑** on that row.<br>2. Verify dialog wording uses the real displayed name.<br>3. Click **OK**. | Dialog shows the full program name correctly. Program removed from list immediately; success message shown. | Medium |
| TC-004 | Confirm delete removes program at max reasonable name length | Admin. Program **P** × 255 (255-character name) exists per product max. | 1. Delete via **🗑**.<br>2. Confirm **OK**. | Dialog shows truncated or full name per UI rules but remains readable; deletion succeeds; list updates without refresh. | Medium |
| TC-005 | Empty state appears after deleting the last remaining program | Admin. Exactly one program **Solo Program** remains. | 1. Delete **Solo Program** with **OK** on confirm. | List shows **🎓**, text **No programs yet. Create your first program to get started.**, and button **Create Program**. No stale row. | High |
| TC-006 | After delete success, navigating away and back still shows deleted program absent | Admin. **Obsolete Program** deleted successfully in prior session or same session. | 1. Delete **Obsolete Program** with confirm.<br>2. Navigate to another admin area and return to programs. | **Obsolete Program** does not reappear; server is source of truth. | Medium |

---

## Negative flows

| TC ID | Title (expected behavior) | Preconditions | Steps | Expected result | Priority |
|-------|---------------------------|---------------|-------|-----------------|----------|
| TC-007 | Failed delete does not remove program from list | Admin. **Locked Program** row visible. Mock or force API **500** / **403** on delete. | 1. Click **🗑** on **Locked Program**.<br>2. Click **OK**. | Error is **displayed** to user. **Locked Program** **remains** in list. No false success message. | High |
| TC-008 | Network timeout does not optimistically remove program | Admin. **Timeout Program** exists. Simulate request timeout. | 1. Confirm delete **OK**.<br>2. Wait for timeout. | Program stays in list (or reappears if optimistic UI—**expected**: list consistent with failure). User sees error/timeout message. | High |
| TC-009 | Double confirmation does not cause duplicate delete errors | Admin. **Single Delete Program** exists. Network slow. | 1. Open confirm, click **OK** once.<br>2. Rapidly click **OK** again if dialog reappears (should not) or repeat action only if UI allows. | Only one successful delete; no unhandled error; no duplicate requests that corrupt UI. | Medium |
| TC-010 | Non-admin must not delete programs (if role-gated) | User **qa-viewer@school.edu** has no admin delete right. **Admin Only Program** exists. | 1. Open programs as non-admin (or without delete permission).<br>2. Attempt delete if control visible. | **🗑** hidden or delete returns **403** with message; program **Admin Only Program** unchanged. | High |
| TC-011 | Deleting while another user views list does not break local list | Two browsers: Admin A and Admin B. **Shared Program** exists. | 1. A confirms delete **Shared Program**.<br>2. B's list: trigger refresh or wait for re-fetch policy. | Per product: B eventually sees removal or on next navigation/refresh; no crash; no "ghost" row without error handling. | Low |

---

## Edge cases

| TC ID | Title (expected behavior) | Preconditions | Steps | Expected result | Priority |
|-------|---------------------------|---------------|-------|-----------------|----------|
| TC-012 | Program name with HTML-like text does not execute script in dialog | Admin. Program **`<img src=x onerror=alert(1)>` Program** (stored as plain text). | 1. Click **🗑**.<br>2. Read dialog; click **Cancel**. | Dialog shows escaped/plain text; no script execution. | Medium |
| TC-013 | Duplicate display names: correct row is deleted | Admin. Two programs both titled **Duplicate Name** (different IDs). | 1. Delete **🗑** on the **second** row only.<br>2. Confirm **OK**. | Only that row's program is removed; the other **Duplicate Name** remains. | High |
| TC-014 | Very long list: delete updates row without full page reload | Admin. **50+** programs; target **Zebra Program** last row. | 1. Delete **Zebra Program** with confirm. | Row removed; scroll position reasonable; list re-fetched; no browser full reload. | Medium |
| TC-015 | Cancel then delete same program still works | Admin. **Try Again Program** exists. | 1. **🗑** → **Cancel**.<br>2. **🗑** again → **OK**. | After second flow, **Try Again Program** removed; one success message. | Medium |
| TC-016 | Keyboard / accessibility: Esc and focus on native confirm | Admin. **Keyboard Program** exists. | 1. Focus **🗑**, activate with keyboard.<br>2. Use **Esc** or **Tab** to **Cancel** per OS dialog. | Dialog dismisses without delete; program remains. | Low |
| TC-017 | Semesters and courses removed is reflected downstream (smoke) | Admin. **Rich Program** has semester **Fall 2026** and course **CS-101**. | 1. Confirm delete **Rich Program**. | API success; program gone from list; spot-check related UI/API no longer lists those semesters/courses under that program (per product design). | Medium |

---

## Ambiguities or gaps in the ACs

1. **Success feedback**: Flow says "program removed from list immediately"; Delete Confirmation also says "confirmation message" on success. AC only asserts removal from the list—**type, copy, and duration** of the success message are unspecified.
2. **Native dialog**: Using `window.confirm` limits styling, i18n, and analytics; **no AC** for localized strings or a11y beyond OS behavior.
3. **Admin-only**: Story says "admin user" but AC does not define **403**, hidden actions, or audit logging for failed attempts.
4. **API contract**: No AC for **HTTP status**, idempotency, or behavior when program is already deleted (404/409).
5. **Optimistic UI**: "Re-fetch after mutation" is clear; not specified whether UI **briefly** shows loading or disables the row during the request.
6. **Concurrent edits**: No requirement for **stale data** if another admin edits the program while delete is in flight.
7. **Empty input / boundary**: Program name is not user-entered on delete; **max length and special characters** are product limits for **create**, not defined in AC for delete dialog display.
8. **"Prepopulated values"**: Interpreted as **seed/prepopulated programs**; AC does not mention **demo data** vs production **empty** tenant.
