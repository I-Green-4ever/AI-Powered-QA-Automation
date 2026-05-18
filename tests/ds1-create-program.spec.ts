import { test, expect, type Page, type Dialog } from '@playwright/test';
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
 * Shape: "dd/MMM/yyyy [hh:mm:ss]" e.g. "17/May/2026 [18:46:21]".
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

  // Wait for an authenticated landmark rather than just a URL change.
  await expect(page.getByRole('button', { name: /Programs/ })).toBeVisible();
}

async function openNewProgramModal(page: Page) {
  await page.goto('/programs');
  await page.getByRole('button', { name: '+ New Program' }).click();
  const dialog = page.getByRole('dialog', { name: 'New Program' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('DS-1 Create Program (Didaxis Studio)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ---------------------------------------------------------------------------
  // Positive flows
  // ---------------------------------------------------------------------------

  test('TC-001 - Clicking + New Program opens the creation form with required fields', async ({ page }) => {
    const dialog = await openNewProgramModal(page);

    const nameInput = dialog.getByLabel('Program Name');
    const descInput = dialog.getByLabel('Description');
    const createBtn = dialog.getByRole('button', { name: 'Create' });

    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveAttribute('placeholder', 'e.g. Computer Science BSc');

    await expect(descInput).toBeVisible();
    await expect(descInput).toHaveAttribute('placeholder', 'Brief description');

    await expect(createBtn).toBeVisible();
    // With empty name, Create must start disabled (AC3 reinforcement).
    await expect(createBtn).toBeDisabled();
  });

  test('TC-002 - Creating with valid Program Name and Description succeeds', async ({ page }) => {
    const programName = `I.G. Web Development 2026 ${uniqueSuffix()}`;
    const programDescription = 'Full-stack web development program';

    const dialog = await openNewProgramModal(page);
    await dialog.getByLabel('Program Name').fill(programName);
    await dialog.getByLabel('Description').fill(programDescription);
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(dialog).toBeHidden();

    // New row appears in the programs list without a manual refresh.
    const newRow = page.getByRole('row', { name: programName });
    await expect(newRow).toBeVisible();
    await expect(newRow).toContainText(programDescription);
  });

  test('TC-003 - Modal closes immediately after a successful Create', async ({ page }) => {
    const programName = `I.G. Smoke Create ${uniqueSuffix()}`;

    const dialog = await openNewProgramModal(page);
    await dialog.getByLabel('Program Name').fill(programName);
    await dialog.getByLabel('Description').fill('I.G. smoke create');
    await dialog.getByRole('button', { name: 'Create' }).click();

    // Within ~2s, the dialog should be gone, and no second click is required.
    await expect(dialog).toBeHidden({ timeout: 2000 });
    await expect(page.getByRole('row', { name: programName })).toBeVisible();
  });

  test('TC-004 - Newly created program is persisted (visible after navigation)', async ({ page }) => {
    const programName = `I.G. Persisted ${uniqueSuffix()}`;

    const dialog = await openNewProgramModal(page);
    await dialog.getByLabel('Program Name').fill(programName);
    await dialog.getByLabel('Description').fill('I.G. persisted across navigation');
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('row', { name: programName })).toBeVisible();

    // Navigate away and back — the row must come from the server, not local state.
    await page.getByRole('button', { name: /Dashboard/ }).click();
    await page.getByRole('button', { name: /Programs/ }).click();

    await expect(page.getByRole('row', { name: programName })).toBeVisible();
  });

  test('TC-005 - Description is optional — program creates with name only', async ({ page }) => {
    const programName = `I.G. Name Only ${uniqueSuffix()}`;

    const dialog = await openNewProgramModal(page);
    await dialog.getByLabel('Program Name').fill(programName);
    // Leave Description empty on purpose.
    const createBtn = dialog.getByRole('button', { name: 'Create' });

    // Per current product behavior, Create is enabled with a non-empty name only.
    await expect(createBtn).toBeEnabled();
    await createBtn.click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('row', { name: programName })).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Negative flows
  // ---------------------------------------------------------------------------

  test('TC-006 - Empty Program Name keeps Create disabled (AC3)', async ({ page }) => {
    const dialog = await openNewProgramModal(page);

    const createBtn = dialog.getByRole('button', { name: 'Create' });
    await expect(createBtn).toBeDisabled();

    // Pressing Enter inside Program Name while empty must not create a program.
    await dialog.getByLabel('Program Name').focus();
    await page.keyboard.press('Enter');

    await expect(dialog).toBeVisible();
    await expect(createBtn).toBeDisabled();
  });

  test('TC-007 - Whitespace-only Program Name is treated as empty', async ({ page }) => {
    const dialog = await openNewProgramModal(page);

    await dialog.getByLabel('Program Name').fill('   ');
    const createBtn = dialog.getByRole('button', { name: 'Create' });

    await expect(createBtn).toBeDisabled();
    // A program literally named "   " must never appear in the list.
    await expect(page.getByRole('row', { name: '   ' })).toHaveCount(0);
  });

  test('TC-008 - Cancelling the modal discards entered values and creates nothing', async ({ page }) => {
    const draftName = `I.G. Cancelled ${uniqueSuffix()}`;

    const dialog = await openNewProgramModal(page);
    await dialog.getByLabel('Program Name').fill(draftName);
    await dialog.getByLabel('Description').fill('I.G. should not be saved');
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('row', { name: draftName })).toHaveCount(0);

    // Re-opening the modal must show empty fields (no draft retention).
    const reopened = await openNewProgramModal(page);
    await expect(reopened.getByLabel('Program Name')).toHaveValue('');
    await expect(reopened.getByLabel('Description')).toHaveValue('');
  });

  test('TC-009 - Server failure (5xx) on Create surfaces an error and does not add a row', async ({ page }) => {
    const programName = `I.G. Server Failure ${uniqueSuffix()}`;

    // Force the create endpoint to fail with a 500 so we can assert the UX.
    await page.route('**/api/programs', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Simulated server failure' }),
        });
        return;
      }
      await route.continue();
    });

    const dialog = await openNewProgramModal(page);
    await dialog.getByLabel('Program Name').fill(programName);
    await dialog.getByLabel('Description').fill('I.G. 500 simulation');
    await dialog.getByRole('button', { name: 'Create' }).click();

    // Modal should stay open (data preserved) and no new row should appear.
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Program Name')).toHaveValue(programName);
    await expect(page.getByRole('row', { name: programName })).toHaveCount(0);
  });

  // Ambiguity #5 from the test plan: no non-admin credentials are provisioned
  // for this suite, so TC-010 is intentionally skipped until they exist.
  test.skip('TC-010 - Non-admin user cannot create programs (if role-gated)', async () => {
    // Requires a non-admin account (e.g. qa-viewer@school.edu). Provide
    // DIDAXIS_VIEWER_EMAIL / DIDAXIS_VIEWER_PASSWORD env vars and remove
    // the skip to enable.
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  test('TC-011 - Maximum-length Program Name is accepted (boundary 255 chars)', async ({ page }) => {
    // "I.G. " (5) + 250 × "P" = 255 chars total.
    const programName = `I.G. ${'P'.repeat(250)}`;
    expect(programName).toHaveLength(255);

    const dialog = await openNewProgramModal(page);
    await dialog.getByLabel('Program Name').fill(programName);
    await dialog.getByLabel('Description').fill('I.G. max name');
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('row', { name: programName })).toBeVisible();
  });

  test('TC-012 - Special characters and Unicode in Program Name are preserved', async ({ page }) => {
    const programName = `I.G. Renée's "Accelerated" Program ${uniqueSuffix()}`;

    const dialog = await openNewProgramModal(page);
    await dialog.getByLabel('Program Name').fill(programName);
    await dialog.getByLabel('Description').fill('I.G. special chars');
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('row', { name: programName })).toBeVisible();
  });

  test('TC-013 - HTML-like text in Program Name is rendered as plain text (no XSS)', async ({ page }) => {
    const programName = `I.G. <img src=x onerror=alert(1)> ${uniqueSuffix()}`;

    // Fail loudly if the page tries to fire a native alert/confirm/prompt.
    const nativeDialogs: Dialog[] = [];
    page.on('dialog', (d) => {
      nativeDialogs.push(d);
      void d.dismiss();
    });

    const dialog = await openNewProgramModal(page);
    await dialog.getByLabel('Program Name').fill(programName);
    await dialog.getByLabel('Description').fill('I.G. xss');
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('row', { name: programName })).toBeVisible();
    expect(nativeDialogs).toHaveLength(0);
  });

  test('TC-014 - Creating a second program with an existing name is rejected (DS-3 AC3)', async ({ page }) => {
    const programName = `I.G. Duplicate Name ${uniqueSuffix()}`;

    // Step 1: create the original row.
    const firstDialog = await openNewProgramModal(page);
    await firstDialog.getByLabel('Program Name').fill(programName);
    await firstDialog.getByLabel('Description').fill('I.G. first');
    await firstDialog.getByRole('button', { name: 'Create' }).click();
    await expect(firstDialog).toBeHidden();
    await expect(page.getByRole('row', { name: programName })).toHaveCount(1);

    // Step 2: attempt to create a second program with the exact same name.
    const secondDialog = await openNewProgramModal(page);
    await secondDialog.getByLabel('Program Name').fill(programName);
    await secondDialog.getByLabel('Description').fill('I.G. second');
    await secondDialog.getByRole('button', { name: 'Create' }).click();

    // Modal stays open with entered values preserved.
    await expect(secondDialog).toBeVisible();
    await expect(secondDialog.getByLabel('Program Name')).toHaveValue(programName);
    await expect(secondDialog.getByLabel('Description')).toHaveValue('I.G. second');

    // Exactly one row with that name remains in the list.
    await expect(page.getByRole('row', { name: programName })).toHaveCount(1);
  });

  test('TC-015 - Very long Description is accepted', async ({ page }) => {
    const programName = `I.G. Long Desc ${uniqueSuffix()}`;
    const longDescription = 'I.G. description '.repeat(60).slice(0, 1000);
    expect(longDescription).toHaveLength(1000);

    const dialog = await openNewProgramModal(page);
    await dialog.getByLabel('Program Name').fill(programName);
    await dialog.getByLabel('Description').fill(longDescription);
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('row', { name: programName })).toBeVisible();
  });

  test('TC-016 - Rapid double-click on Create does not create duplicate programs', async ({ page }) => {
    const programName = `I.G. DoubleClick ${uniqueSuffix()}`;

    // Slow the create endpoint so the user can "race" two clicks against it.
    await page.route('**/api/programs', async (route) => {
      if (route.request().method() === 'POST') {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      await route.continue();
    });

    const dialog = await openNewProgramModal(page);
    await dialog.getByLabel('Program Name').fill(programName);
    await dialog.getByLabel('Description').fill('I.G. double click guard');

    const createBtn = dialog.getByRole('button', { name: 'Create' });
    await Promise.all([createBtn.click(), createBtn.click({ force: true }).catch(() => {})]);

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('row', { name: programName })).toHaveCount(1);
  });

  test('TC-017 - Closing the modal with Esc while typing discards input', async ({ page }) => {
    const draftName = `I.G. EscDiscard ${uniqueSuffix()}`;

    const dialog = await openNewProgramModal(page);
    await dialog.getByLabel('Program Name').fill(draftName);
    await page.keyboard.press('Escape');

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('row', { name: draftName })).toHaveCount(0);

    // Re-opening must show empty fields (no draft retention).
    const reopened = await openNewProgramModal(page);
    await expect(reopened.getByLabel('Program Name')).toHaveValue('');
    await expect(reopened.getByLabel('Description')).toHaveValue('');
  });
});
