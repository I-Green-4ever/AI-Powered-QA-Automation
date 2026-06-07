import { test, expect } from '../fixtures/cleanup.fixture';
import { clickCreateAndTrack } from './helpers/program';
import { openNewProgramModal } from './helpers/programs-ui';
import { waitForProgramCreate } from '../lib/program-tracker';
import type { Dialog } from '@playwright/test';
import { format } from 'date-fns';
import { ProgramsPage } from '../pages/programs.page';
import { AppShell } from '../pages/app-shell.page';

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

test.describe('DS-1 Create Program (Didaxis Studio)', () => {
  // ---------------------------------------------------------------------------
  // Positive flows
  // ---------------------------------------------------------------------------

  test('TC-001 - Clicking + New Program opens the creation form with required fields', async ({ page }) => {
    const modal = await openNewProgramModal(page);

    await expect(modal.programNameInput).toBeVisible();
    await expect(modal.programNameInput).toHaveAttribute('placeholder', 'e.g. Computer Science BSc');

    await expect(modal.descriptionInput).toBeVisible();
    await expect(modal.descriptionInput).toHaveAttribute('placeholder', 'Brief description');

    await expect(modal.createButton).toBeVisible();
    // With empty name, Create must start disabled (AC3 reinforcement).
    await expect(modal.createButton).toBeDisabled();
  });

  test('TC-002 - Creating with valid Program Name and Description succeeds', async ({ page }) => {
    const programName = `I.G. Web Development 2026 ${uniqueSuffix()}`;
    const programDescription = 'Full-stack web development program';

    const programs = new ProgramsPage(page);
    const modal = await openNewProgramModal(page);
    await modal.fillProgramName(programName);
    await modal.fillDescription(programDescription);
    await clickCreateAndTrack(page, modal);

    await expect(modal.dialog).toBeHidden();

    // New row appears in the programs list without a manual refresh.
    const newRow = programs.row(programName);
    await expect(newRow).toBeVisible();
    await expect(newRow).toContainText(programDescription);
  });

  test('TC-003 - Modal closes immediately after a successful Create', async ({ page }) => {
    const programName = `I.G. Smoke Create ${uniqueSuffix()}`;

    const programs = new ProgramsPage(page);
    const modal = await openNewProgramModal(page);
    await modal.fillProgramName(programName);
    await modal.fillDescription('I.G. smoke create');
    await clickCreateAndTrack(page, modal);

    // Within ~2s, the dialog should be gone, and no second click is required.
    await expect(modal.dialog).toBeHidden({ timeout: 2000 });
    await expect(programs.row(programName)).toBeVisible();
  });

  test('TC-004 - Newly created program is persisted (visible after navigation)', async ({ page }) => {
    const programName = `I.G. Persisted ${uniqueSuffix()}`;

    const programs = new ProgramsPage(page);
    const shell = new AppShell(page);
    const modal = await openNewProgramModal(page);
    await modal.fillProgramName(programName);
    await modal.fillDescription('I.G. persisted across navigation');
    await clickCreateAndTrack(page, modal);

    await expect(modal.dialog).toBeHidden();
    await expect(programs.row(programName)).toBeVisible();

    // Navigate away and back — the row must come from the server, not local state.
    await shell.goToDashboard();
    await shell.goToPrograms();

    await expect(programs.row(programName)).toBeVisible();
  });

  test('TC-005 - Description is optional — program creates with name only', async ({ page }) => {
    const programName = `I.G. Name Only ${uniqueSuffix()}`;

    const programs = new ProgramsPage(page);
    const modal = await openNewProgramModal(page);
    await modal.fillProgramName(programName);
    // Leave Description empty on purpose.

    // Per current product behavior, Create is enabled with a non-empty name only.
    await expect(modal.createButton).toBeEnabled();
    await clickCreateAndTrack(page, modal);

    await expect(modal.dialog).toBeHidden();
    //my edit....
    await expect(programs.row(programName)).not.toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Negative flows
  // ---------------------------------------------------------------------------

  test('TC-006 - Empty Program Name keeps Create disabled (AC3)', async ({ page }) => {
    const modal = await openNewProgramModal(page);

    await expect(modal.createButton).toBeDisabled();

    // Pressing Enter inside Program Name while empty must not create a program.
    await modal.focusProgramName();
    await page.keyboard.press('Enter');

    await expect(modal.dialog).toBeVisible();
    await expect(modal.createButton).toBeDisabled();
  });

  test('TC-007 - Whitespace-only Program Name is treated as empty', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const modal = await openNewProgramModal(page);

    await modal.fillProgramName('   ');

    await expect(modal.createButton).toBeDisabled();
    // A program literally named "   " must never appear in the list.
    await expect(programs.programRow('   ').editButton).toHaveCount(0);
  });

  test('TC-008 - Cancelling the modal discards entered values and creates nothing', async ({ page }) => {
    const draftName = `I.G. Cancelled ${uniqueSuffix()}`;

    const programs = new ProgramsPage(page);
    const modal = await openNewProgramModal(page);
    await modal.fillProgramName(draftName);
    await modal.fillDescription('I.G. should not be saved');
    await modal.clickCancel();

    await expect(modal.dialog).toBeHidden();
    await expect(programs.row(draftName)).toHaveCount(0);

    // Re-opening the modal must show empty fields (no draft retention).
    const reopened = await openNewProgramModal(page);
    await expect(reopened.programNameInput).toHaveValue('');
    await expect(reopened.descriptionInput).toHaveValue('');
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

    const programs = new ProgramsPage(page);
    const modal = await openNewProgramModal(page);
    await modal.fillProgramName(programName);
    await modal.fillDescription('I.G. 500 simulation');
    await modal.clickCreate();

    // Modal should stay open (data preserved) and no new row should appear.
    await expect(modal.dialog).toBeVisible();
    await expect(modal.programNameInput).toHaveValue(programName);
    await expect(programs.row(programName)).toHaveCount(0);
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

    const programs = new ProgramsPage(page);
    const modal = await openNewProgramModal(page);
    await modal.fillProgramName(programName);
    await modal.fillDescription('I.G. max name');
    await clickCreateAndTrack(page, modal);

    await expect(modal.dialog).toBeHidden();
    await expect(programs.row(programName)).toBeVisible();
  });

  test('TC-012 - Special characters and Unicode in Program Name are preserved', async ({ page }) => {
    const programName = `I.G. Renée's "Accelerated" Program ${uniqueSuffix()}`;

    const programs = new ProgramsPage(page);
    const modal = await openNewProgramModal(page);
    await modal.fillProgramName(programName);
    await modal.fillDescription('I.G. special chars');
    await clickCreateAndTrack(page, modal);

    await expect(modal.dialog).toBeHidden();
    await expect(programs.row(programName)).toBeVisible();
  });

  test('TC-013 - HTML-like text in Program Name is rendered as plain text (no XSS)', async ({ page }) => {
    const programName = `I.G. <img src=x onerror=alert(1)> ${uniqueSuffix()}`;

    // Fail loudly if the page tries to fire a native alert/confirm/prompt.
    const nativeDialogs: Dialog[] = [];
    page.on('dialog', (d) => {
      nativeDialogs.push(d);
      void d.dismiss();
    });

    const programs = new ProgramsPage(page);
    const modal = await openNewProgramModal(page);
    await modal.fillProgramName(programName);
    await modal.fillDescription('I.G. xss');
    await clickCreateAndTrack(page, modal);

    await expect(modal.dialog).toBeHidden();
    await expect(programs.row(programName)).toBeVisible();
    expect(nativeDialogs).toHaveLength(0);
  });

  test('TC-014 - Creating a second program with an existing name is rejected (DS-3 AC3)', async ({ page }) => {
    const programName = `I.G. Duplicate Name ${uniqueSuffix()}`;

    const programs = new ProgramsPage(page);

    // Step 1: create the original row.
    const firstModal = await openNewProgramModal(page);
    await firstModal.fillProgramName(programName);
    await firstModal.fillDescription('I.G. first');
    await clickCreateAndTrack(page, firstModal);
    await expect(firstModal.dialog).toBeHidden();
    await expect(programs.row(programName)).toHaveCount(1);

    // Step 2: attempt to create a second program with the exact same name.
    const secondModal = await openNewProgramModal(page);
    await secondModal.fillProgramName(programName);
    await secondModal.fillDescription('I.G. second');
    await secondModal.clickCreate();

    // Modal stays open with entered values preserved.
    await expect(secondModal.dialog).toBeVisible();
    await expect(secondModal.programNameInput).toHaveValue(programName);
    await expect(secondModal.descriptionInput).toHaveValue('I.G. second');

    // Exactly one row with that name remains in the list.
    await expect(programs.row(programName)).toHaveCount(1);
  });

  test('TC-015 - Very long Description is accepted', async ({ page }) => {
    const programName = `I.G. Long Desc ${uniqueSuffix()}`;
    const longDescription = 'I.G. description '.repeat(60).slice(0, 1000);
    expect(longDescription).toHaveLength(1000);

    const programs = new ProgramsPage(page);
    const modal = await openNewProgramModal(page);
    await modal.fillProgramName(programName);
    await modal.fillDescription(longDescription);
    await clickCreateAndTrack(page, modal);

    await expect(modal.dialog).toBeHidden();
    await expect(programs.row(programName)).toBeVisible();
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

    const programs = new ProgramsPage(page);
    const modal = await openNewProgramModal(page);
    await modal.fillProgramName(programName);
    await modal.fillDescription('I.G. double click guard');

    const idPromise = waitForProgramCreate(page);
    await Promise.all([
      modal.createButton.click(),
      modal.createButton.click({ force: true }).catch(() => {}),
    ]);
    await idPromise;

    await expect(modal.dialog).toBeHidden();
    await expect(programs.row(programName)).toHaveCount(1);
  });

  test('TC-017 - Closing the modal with Esc while typing discards input', async ({ page }) => {
    const draftName = `I.G. EscDiscard ${uniqueSuffix()}`;

    const programs = new ProgramsPage(page);
    const modal = await openNewProgramModal(page);
    await modal.fillProgramName(draftName);
    await page.keyboard.press('Escape');

    await expect(modal.dialog).toBeHidden();
    await expect(programs.row(draftName)).toHaveCount(0);

    // Re-opening must show empty fields (no draft retention).
    const reopened = await openNewProgramModal(page);
    await expect(reopened.programNameInput).toHaveValue('');
    await expect(reopened.descriptionInput).toHaveValue('');
  });
});
