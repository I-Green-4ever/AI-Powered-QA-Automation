import { test, expect, type Page, type Locator, type Dialog } from '@playwright/test';
import { format } from 'date-fns';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing env var "${name}". Set it in the .env file at the project root.`
    );
  }
  return value;
}

const DIDAXIS_EMAIL = requireEnv('DIDAXIS_EMAIL');
const DIDAXIS_PASSWORD = requireEnv('DIDAXIS_PASSWORD');

/**
 * Build a unique, human-readable suffix for test data so each run produces
 * fresh program names that don't collide with previous runs or seed data.
 * Shape: "dd/MMM/yyyy [hh:mm:ss]" e.g. "17/May/2026 [19:25:03]".
 */
function uniqueSuffix(): string {
  const now = new Date();
  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  const ss = now.getSeconds().toString().padStart(2, '0');

  const timeString = `${hh}:${mm}:${ss}`;

  return `${format(now, 'dd/MMM/yyyy')} [${timeString}]`;
}

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(DIDAXIS_EMAIL);
  await page.getByLabel('Password').fill(DIDAXIS_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('button', { name: /Programs/ })).toBeVisible();
}

async function openNewProgramModal(page: Page): Promise<Locator> {
  await page.goto('/programs');
  await page.getByRole('button', { name: '+ New Program' }).click();
  const dialog = page.getByRole('dialog', { name: 'New Program' });
  await expect(dialog).toBeVisible();
  return dialog;
}

/**
 * Create a program through the UI as a precondition for duplicate-detection tests.
 */
async function createProgram(
  page: Page,
  name: string,
  description = ''
): Promise<void> {
  const dialog = await openNewProgramModal(page);
  await dialog.getByLabel('Program Name').fill(name);
  if (description) {
    await dialog.getByLabel('Description').fill(description);
  }
  await dialog.getByRole('button', { name: 'Create' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('row', { name })).toBeVisible();
}

async function openEditModal(page: Page, programName: string): Promise<Locator> {
  await page.goto('/programs');
  const row = page.getByRole('row', { name: programName });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: '✏️' }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit Program' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('DS-3 Program Name Validation & Duplicate Prevention (Didaxis Studio)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ---------------------------------------------------------------------------
  // Positive flows
  // ---------------------------------------------------------------------------

  test('TC-001 - Name with allowed special characters is accepted (AC2 verbatim)', async ({ page }) => {
    // The AC2 string is quoted verbatim per the plan's "Note on test data".
    // To keep the test independent and idempotent across runs, we tag it with
    // a timestamp so each run still creates a fresh row.
    const programName = `Informatique & IA - Niveau 2 ${uniqueSuffix()}`;
    const description = `I.G. ${uniqueSuffix()}`;

    const dialog = await openNewProgramModal(page);
    await dialog.getByLabel('Program Name').fill(programName);
    await dialog.getByLabel('Description').fill(description);
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(dialog).toBeHidden();
    const row = page.getByRole('row', { name: programName });
    await expect(row).toBeVisible();
    // No HTML-encoded entities: the ampersand must render as "&", not "&amp;".
    await expect(page.getByText(programName, { exact: true })).toHaveCount(1);
    await expect(page.getByText('&amp;', { exact: false })).toHaveCount(0);
  });

  test('TC-002 - Smart quotes, apostrophe, and accented Unicode are accepted', async ({ page }) => {
    const programName = `I.G. Renée's "Accelerated" 2026 ${uniqueSuffix()}`;

    const dialog = await openNewProgramModal(page);
    await dialog.getByLabel('Program Name').fill(programName);
    await dialog.getByLabel('Description').fill('I.G. unicode positive');
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText(programName, { exact: true })).toHaveCount(1);

    // Re-opening edit (per DS-2) shows the same characters byte-for-byte.
    const editDialog = await openEditModal(page, programName);
    await expect(editDialog.getByLabel('Program Name')).toHaveValue(programName);
  });

  test('TC-003 - Internal whitespace is preserved; only edges are trimmed', async ({ page }) => {
    const innerName = `I.G. Trim Edges Only ${uniqueSuffix()}`;
    const paddedName = `   ${innerName}   `;

    const dialog = await openNewProgramModal(page);
    await dialog.getByLabel('Program Name').fill(paddedName);
    await dialog.getByLabel('Description').fill('I.G. trim');
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(dialog).toBeHidden();
    // Row name is exactly the trimmed inner string — leading/trailing spaces stripped.
    await expect(page.getByText(innerName, { exact: true })).toHaveCount(1);
    // The padded (untrimmed) form must NOT appear as a row name.
    await expect(page.getByText(paddedName, { exact: true })).toHaveCount(0);
  });

  test('TC-004 - Mixed case, digits, and punctuation all create successfully', async ({ page }) => {
    const programName = `I.G. CS-101 / 2026 (Cohort #2) ${uniqueSuffix()}`;

    const dialog = await openNewProgramModal(page);
    await dialog.getByLabel('Program Name').fill(programName);
    await dialog.getByLabel('Description').fill('I.G. mixed');
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText(programName, { exact: true })).toHaveCount(1);
  });

  // ---------------------------------------------------------------------------
  // Negative flows
  // ---------------------------------------------------------------------------

  test('TC-005 - Whitespace-only name (3 spaces) is rejected — form not submitted (AC1 verbatim)', async ({ page }) => {
    const dialog = await openNewProgramModal(page);

    // Track any POST /api/programs traffic — none should occur for this case.
    let postCount = 0;
    page.on('request', (req) => {
      if (req.method() === 'POST' && /\/api\/programs(\?|$)/.test(req.url())) {
        postCount++;
      }
    });

    await dialog.getByLabel('Program Name').fill('   ');
    await dialog.getByLabel('Description').fill('I.G. ws-only desc');
    const createBtn = dialog.getByRole('button', { name: 'Create' });

    // Form must not submit: button disabled is the current (preferred) UX.
    await expect(createBtn).toBeDisabled();
    await expect(dialog).toBeVisible();

    // No row literally named "   " or "" should ever exist.
    await expect(page.getByText('   ', { exact: true })).toHaveCount(0);
    expect(postCount).toBe(0);
  });

  test('TC-006 - Completely empty name is rejected (DS-1 AC3 cross-coverage)', async ({ page }) => {
    const dialog = await openNewProgramModal(page);

    const nameInput = dialog.getByLabel('Program Name');
    const createBtn = dialog.getByRole('button', { name: 'Create' });

    await expect(createBtn).toBeDisabled();

    // Pressing Enter in an empty Program Name must not submit.
    await nameInput.focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
    await expect(createBtn).toBeDisabled();
  });

  test('TC-007 - Tabs / newlines / non-breaking-space whitespace are treated as empty', async ({ page }) => {
    const dialog = await openNewProgramModal(page);
    const createBtn = dialog.getByRole('button', { name: 'Create' });

    // Tab + ASCII space + NBSP (U+00A0) + newline.
    const whitespaceMix = '\t \u00A0\n';

    await dialog.getByLabel('Program Name').fill(whitespaceMix);

    // Per AC1 (post-trim) the form should not be submittable.
    await expect(createBtn).toBeDisabled();
    await expect(dialog).toBeVisible();
    await expect(page.getByText(whitespaceMix, { exact: true })).toHaveCount(0);
  });

  test('TC-008 - Creating a second program with an existing name is rejected (AC3 verbatim)', async ({ page }) => {
    const programName = `I.G. Web Development 2026 ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. dup precondition');

    // Now attempt to create a second program with the exact same name.
    const dialog = await openNewProgramModal(page);
    await dialog.getByLabel('Program Name').fill(programName);
    await dialog.getByLabel('Description').fill('I.G. duplicate try');
    await dialog.getByRole('button', { name: 'Create' }).click();

    // Modal stays open with values preserved (per AC3 + plan).
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Program Name')).toHaveValue(programName);

    // List still contains exactly one row with that name.
    await expect(page.getByText(programName, { exact: true })).toHaveCount(1);
  });

  test('TC-009 - Duplicate detection ignores leading/trailing whitespace in the new entry', async ({ page }) => {
    const programName = `I.G. Web Development 2026 ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. dup-trim precondition');

    const dialog = await openNewProgramModal(page);
    await dialog.getByLabel('Program Name').fill(`   ${programName}   `);
    await dialog.getByLabel('Description').fill('I.G. dup with padding');
    await dialog.getByRole('button', { name: 'Create' }).click();

    // After trim, the candidate matches the existing name → duplicate error.
    await expect(dialog).toBeVisible();
    // No second row was created.
    await expect(page.getByText(programName, { exact: true })).toHaveCount(1);
  });

  test('TC-010 - Duplicate detection across letter case (case-insensitive policy assumed)', async ({ page }) => {
    // PRODUCT POLICY ASSUMPTION (see plan ambiguity #2): human-readable
    // program names should be case-insensitively unique. If product is
    // case-sensitive, flip this expectation.
    const programName = `I.G. Web Development 2026 ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. dup-case precondition');

    const dialog = await openNewProgramModal(page);
    await dialog.getByLabel('Program Name').fill(programName.toLowerCase());
    await dialog.getByLabel('Description').fill('I.G. dup lowercase try');
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(dialog).toBeVisible();
    // No second row in any case variant.
    await expect(page.getByText(programName, { exact: true })).toHaveCount(1);
    await expect(page.getByText(programName.toLowerCase(), { exact: true })).toHaveCount(0);
  });

  test('TC-011 - Re-create after delete succeeds when name reuse is allowed (preferred policy)', async ({ page }) => {
    // PRODUCT POLICY ASSUMPTION (see plan ambiguity #4): duplicate check
    // operates on ACTIVE programs only — names are reusable after delete.
    const programName = `I.G. Reusable ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. first incarnation');

    // Delete the row via the per-row "🗑" button (mirrors DS-4 flow).
    const originalRow = page.getByRole('row', { name: programName });
    page.once('dialog', (d) => void d.accept());
    await originalRow.getByRole('button', { name: '🗑' }).click();
    await expect(page.getByRole('row', { name: programName })).toHaveCount(0);

    // Re-create with the same name — must succeed.
    await createProgram(page, programName, 'I.G. second incarnation');
    await expect(page.getByText(programName, { exact: true })).toHaveCount(1);
  });

  test('TC-012 - Error copy for duplicate is human-readable and field-scoped', async ({ page }) => {
    const programName = `I.G. ErrorCopy ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. error-copy precondition');

    const dialog = await openNewProgramModal(page);
    await dialog.getByLabel('Program Name').fill(programName);
    await dialog.getByLabel('Description').fill('I.G. error copy try');
    await dialog.getByRole('button', { name: 'Create' }).click();

    // Modal stays open after the duplicate is rejected.
    await expect(dialog).toBeVisible();

    // Field-scoped error UX: a role=alert message that mentions uniqueness.
    const alert = dialog.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toHaveText(/already exists|duplicate|taken|in use/i);

    // The error must be associated with the Program Name field for AT users.
    const nameInput = dialog.getByLabel('Program Name');
    await expect(nameInput).toHaveAttribute('aria-describedby', /.+/);
  });

  test('TC-013 - After a duplicate error, fixing the name and re-clicking Create succeeds', async ({ page }) => {
    const baseName = `I.G. Web Development 2026 ${uniqueSuffix()}`;
    const correctedName = `${baseName} - Cohort B`;
    const originalDescription = 'I.G. recovery description';

    await createProgram(page, baseName, 'I.G. recovery precondition');

    // Trigger duplicate error.
    const dialog = await openNewProgramModal(page);
    await dialog.getByLabel('Program Name').fill(baseName);
    await dialog.getByLabel('Description').fill(originalDescription);
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(dialog).toBeVisible();
    // Description value must be preserved through the retry (no data loss).
    await expect(dialog.getByLabel('Description')).toHaveValue(originalDescription);

    // Fix the name and re-submit.
    await dialog.getByLabel('Program Name').fill(correctedName);
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText(correctedName, { exact: true })).toHaveCount(1);
    // Original row is still there as well.
    await expect(page.getByText(baseName, { exact: true })).toHaveCount(1);
  });

  // Requires two concurrent admin sessions racing the same POST. Out of
  // scope for a single-page test; left as documentation for an integration
  // run that uses two browser contexts.
  test.skip('TC-014 - Race: two clients create the same name nearly simultaneously', async () => {
    // Two browser.newContext() sessions, both POST same name back-to-back;
    // exactly one row must be created; the loser sees the duplicate error.
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  test('TC-015 - RTL Unicode (Arabic) is accepted and preserved', async ({ page }) => {
    const programName = `I.G. برنامج تجريبي ${uniqueSuffix()}`;

    const dialog = await openNewProgramModal(page);
    await dialog.getByLabel('Program Name').fill(programName);
    await dialog.getByLabel('Description').fill('I.G. rtl');
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText(programName, { exact: true })).toHaveCount(1);

    // Bytes round-trip on re-open (per DS-2 TC-002 contract).
    const editDialog = await openEditModal(page, programName);
    await expect(editDialog.getByLabel('Program Name')).toHaveValue(programName);
  });

  test('TC-016 - Emoji and supplementary-plane Unicode are accepted', async ({ page }) => {
    const programName = `I.G. 🎓 Cohort 2026 ${uniqueSuffix()}`;

    const dialog = await openNewProgramModal(page);
    await dialog.getByLabel('Program Name').fill(programName);
    await dialog.getByLabel('Description').fill('I.G. emoji');
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText(programName, { exact: true })).toHaveCount(1);
    // Sanity: literal "?" replacement-character pattern must not appear in the row.
    const row = page.getByRole('row', { name: programName });
    await expect(row).toContainText('🎓');
  });

  test('TC-017 - Combining vs precomposed Unicode is treated consistently for duplicates (NFC-normalize preferred)', async ({ page }) => {
    // PRODUCT POLICY ASSUMPTION (see plan ambiguity #5): the system should
    // NFC-normalize before comparison so "é" (precomposed) and "e + ́ "
    // (combining acute) are treated as the same name.
    const suffix = uniqueSuffix();
    const precomposedName = `I.G. Ren\u00E9e ${suffix}`; // é = U+00E9
    const combiningName = `I.G. Rene\u0301e ${suffix}`; // e + U+0301
    await createProgram(page, precomposedName, 'I.G. nfc precondition');

    const dialog = await openNewProgramModal(page);
    await dialog.getByLabel('Program Name').fill(combiningName);
    await dialog.getByLabel('Description').fill('I.G. nfc duplicate try');
    await dialog.getByRole('button', { name: 'Create' }).click();

    // With NFC normalization the two strings are equal → duplicate error.
    await expect(dialog).toBeVisible();
    // The original (precomposed) row must remain the only one with that
    // canonical name.
    await expect(page.getByText(precomposedName, { exact: true })).toHaveCount(1);
  });

  test('TC-018 - Invisible / zero-width characters do not bypass duplicate detection', async ({ page }) => {
    // PRODUCT POLICY ASSUMPTION: invisible characters (e.g. ZWSP U+200B)
    // should be stripped before duplicate comparison to prevent bypass
    // (otherwise it's a soft data-integrity risk per plan ambiguity).
    const baseName = `I.G. Web Development 2026 ${uniqueSuffix()}`;
    await createProgram(page, baseName, 'I.G. zwsp precondition');

    // Inject a zero-width space inside the word "Web" so it visually matches
    // but is byte-different.
    const sneakyName = baseName.replace('Web', `Web\u200B`);

    const dialog = await openNewProgramModal(page);
    await dialog.getByLabel('Program Name').fill(sneakyName);
    await dialog.getByLabel('Description').fill('I.G. zwsp duplicate try');
    await dialog.getByRole('button', { name: 'Create' }).click();

    // After invisible-char strip, the candidate equals the existing name.
    await expect(dialog).toBeVisible();
    await expect(page.getByText(baseName, { exact: true })).toHaveCount(1);
  });

  test('TC-019 - HTML-like text in the name is stored as text (XSS-safe)', async ({ page }) => {
    const programName = `I.G. <img src=x onerror=alert(1)> ${uniqueSuffix()}`;

    // Fail loudly if the page tries to fire a native alert/confirm/prompt.
    const nativeDialogs: Dialog[] = [];
    page.on('dialog', (d) => {
      nativeDialogs.push(d);
      void d.dismiss();
    });

    const dialog = await openNewProgramModal(page);
    await dialog.getByLabel('Program Name').fill(programName);
    await dialog.getByLabel('Description').fill('I.G. xss safety');
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText(programName, { exact: true })).toHaveCount(1);
    expect(nativeDialogs).toHaveLength(0);
  });

  test('TC-020 - Very long valid name (255 chars) with allowed special chars persists', async ({ page }) => {
    // "I.G. " (5 chars) + "é-1" * N to fill to 255 chars total.
    // "é-1" is 3 chars (counting é as 1 codepoint). Need 250 more chars → 83 reps + 1 char filler.
    const prefix = 'I.G. ';
    const unit = 'é-1';
    const reps = Math.floor((255 - prefix.length) / unit.length);
    const remainder = 255 - prefix.length - reps * unit.length;
    const programName = prefix + unit.repeat(reps) + 'x'.repeat(remainder);
    expect(programName).toHaveLength(255);

    const dialog = await openNewProgramModal(page);
    await dialog.getByLabel('Program Name').fill(programName);
    await dialog.getByLabel('Description').fill('I.G. long-special');
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText(programName, { exact: true })).toHaveCount(1);

    // A second attempt with the same long name is rejected as duplicate.
    const dialog2 = await openNewProgramModal(page);
    await dialog2.getByLabel('Program Name').fill(programName);
    await dialog2.getByLabel('Description').fill('I.G. long-special dup try');
    await dialog2.getByRole('button', { name: 'Create' }).click();
    await expect(dialog2).toBeVisible();
    await expect(page.getByText(programName, { exact: true })).toHaveCount(1);
  });

  test('TC-021 - Duplicate detection on Edit when renaming to an existing program (cross-cuts DS-2)', async ({ page }) => {
    const suffix = uniqueSuffix();
    const nameA = `I.G. Existing A ${suffix}`;
    const nameB = `I.G. Existing B ${suffix}`;
    await createProgram(page, nameA, 'I.G. existing A');
    await createProgram(page, nameB, 'I.G. existing B');

    const dialog = await openEditModal(page, nameB);
    await dialog.getByLabel('Program Name').fill(nameA);
    await dialog.getByRole('button', { name: 'Save' }).click();

    // Per DS-3's data-integrity intent: rejected, modal stays open, value preserved.
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Program Name')).toHaveValue(nameA);

    // Both rows still exist with their original names; no rename happened.
    await expect(page.getByText(nameA, { exact: true })).toHaveCount(1);
    await expect(page.getByText(nameB, { exact: true })).toHaveCount(1);
  });

  test('TC-022 - Whitespace-only name on Edit is rejected (cross-cuts DS-2)', async ({ page }) => {
    const programName = `I.G. Edit WS-Only ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. edit ws-only precondition');

    const dialog = await openEditModal(page, programName);
    await dialog.getByLabel('Program Name').fill('   ');

    // Save must be disabled (matches TC-005's UX, applied to Edit).
    await expect(dialog.getByRole('button', { name: 'Save' })).toBeDisabled();

    // Original program name still in the list.
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('row', { name: programName })).toBeVisible();
  });
});
