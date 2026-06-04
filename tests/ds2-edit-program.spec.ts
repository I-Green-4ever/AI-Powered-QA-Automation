import { test, expect } from '../fixtures/cleanup.fixture';
import { createProgram } from './helpers/program';
import { openEditModal } from './helpers/programs-ui';
import { ProgramsPage } from '../pages/programs.page';
import { AppShell } from '../pages/app-shell.page';
import type { Dialog } from '@playwright/test';
import { format } from 'date-fns';

/**
 * Build a unique, human-readable suffix for test data so each run produces
 * fresh program names that don't collide with previous runs or seed data.
 * Shape: "dd/MMM/yyyy [hh:mm:ss]" e.g. "17/May/2026 [19:12:03]".
 */
function uniqueSuffix(): string {
  const now = new Date();
  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  const ss = now.getSeconds().toString().padStart(2, '0');

  const timeString = `${hh}:${mm}:${ss}`;

  return `${format(now, 'dd/MMM/yyyy')} [${timeString}]`;
}

test.describe('DS-2 Edit Program (Didaxis Studio)', () => {
  // ---------------------------------------------------------------------------
  // Positive flows
  // ---------------------------------------------------------------------------

  test('TC-001 - Clicking the edit control opens the Edit Program form', async ({ page }) => {
    const programName = `I.G. Edit Open ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. open edit precondition');

    const edit = await openEditModal(page, programName);

    await expect(edit.heading).toBeVisible();
    await expect(edit.saveButton).toBeVisible();
    await expect(edit.cancelButton).toBeVisible();
  });

  test('TC-002 - Edit form is pre-populated with the program current data (AC1)', async ({ page }) => {
    const programName = `I.G. Edit Prepop ${uniqueSuffix()}`;
    const description = 'I.G. prepopulated description';
    await createProgram(page, programName, description);

    const edit = await openEditModal(page, programName);

    await expect(edit.programNameInput).toHaveValue(programName);
    await expect(edit.descriptionInput).toHaveValue(description);
  });

  test('TC-003 - Editing the Name and saving updates the row in the list (AC2)', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const suffix = uniqueSuffix();
    const originalName = `I.G. Rename Source ${suffix}`;
    const newName = `I.G. Rename Target ${suffix}`;
    await createProgram(page, originalName, 'I.G. rename description');

    const edit = await openEditModal(page, originalName);
    await edit.fillProgramName(newName);
    await edit.clickSave();

    await expect(edit.dialog).toBeHidden();
    await expect(programs.row(newName)).toBeVisible();
    // The previous name must be gone — use exact text to avoid matching
    // unrelated rows that happen to share a substring.
    await expect(programs.exactText(originalName)).toHaveCount(0);
  });

  test('TC-004 - The save persists across navigation', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const shell = new AppShell(page);
    const suffix = uniqueSuffix();
    const originalName = `I.G. Persist Source ${suffix}`;
    const newName = `I.G. Persist Target ${suffix}`;
    await createProgram(page, originalName, 'I.G. persist description');

    const edit = await openEditModal(page, originalName);
    await edit.fillProgramName(newName);
    await edit.clickSave();
    await expect(edit.dialog).toBeHidden();
    await expect(programs.row(newName)).toBeVisible();

    // Round-trip through Dashboard to force a re-fetch from the server.
    await shell.goToDashboard();
    await shell.goToPrograms();

    await expect(programs.row(newName)).toBeVisible();
    await expect(programs.exactText(originalName)).toHaveCount(0);
  });

  test('TC-005 - Editing both Name and Description in one save updates both', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const suffix = uniqueSuffix();
    const originalName = `I.G. Edit Both ${suffix}`;
    const newName = `I.G. Edit Both ${suffix} Updated`;
    const beforeDescription = 'I.G. before';
    const afterDescription = 'I.G. after';
    await createProgram(page, originalName, beforeDescription);

    // Count network round-trips so we can assert no double-save.
    let patchCount = 0;
    page.on('request', (req) => {
      if (req.method() === 'PATCH' && /\/api\/programs\//.test(req.url())) {
        patchCount++;
      }
    });

    const edit = await openEditModal(page, originalName);
    await edit.fillProgramName(newName);
    await edit.fillDescription(afterDescription);
    await edit.clickSave();

    await expect(edit.dialog).toBeHidden();
    const row = programs.row(newName);
    await expect(row).toBeVisible();
    await expect(row).toContainText(afterDescription);
    await expect(programs.exactText(beforeDescription)).toHaveCount(0);
    expect(patchCount).toBe(1);
  });

  test('TC-006 - Editing only the Description preserves the Name (AC3)', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. Desc Only ${uniqueSuffix()}`;
    const beforeDescription = 'I.G. before';
    const afterDescription = 'I.G. after';
    await createProgram(page, programName, beforeDescription);

    const edit = await openEditModal(page, programName);
    // Leave Program Name untouched on purpose.
    await edit.fillDescription(afterDescription);
    await edit.clickSave();

    await expect(edit.dialog).toBeHidden();
    const row = programs.row(programName);
    await expect(row).toBeVisible();
    await expect(row).toContainText(afterDescription);
    await expect(programs.exactText(beforeDescription)).toHaveCount(0);
  });

  test('TC-007 - Editing only the Name preserves the Description (AC3 mirror)', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const suffix = uniqueSuffix();
    const originalName = `I.G. Name Only Source ${suffix}`;
    const newName = `I.G. Name Only Target ${suffix}`;
    const description = 'keep me';
    await createProgram(page, originalName, description);

    const edit = await openEditModal(page, originalName);
    await edit.fillProgramName(newName);
    // Description left untouched on purpose.
    await edit.clickSave();

    await expect(edit.dialog).toBeHidden();
    const row = programs.row(newName);
    await expect(row).toBeVisible();
    await expect(row).toContainText(description);
  });

  test('TC-008 - Re-opening edit after save shows the new values pre-populated', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const suffix = uniqueSuffix();
    const originalName = `I.G. Reopen Source ${suffix}`;
    const newName = `I.G. Reopen Target ${suffix}`;
    const description = 'I.G. reopen description';
    await createProgram(page, originalName, description);

    // First edit: rename.
    let edit = await openEditModal(page, originalName);
    await edit.fillProgramName(newName);
    await edit.clickSave();
    await expect(edit.dialog).toBeHidden();
    await expect(programs.row(newName)).toBeVisible();

    // Second edit: open again and confirm the persisted values are shown.
    edit = await openEditModal(page, newName);
    await expect(edit.programNameInput).toHaveValue(newName);
    await expect(edit.descriptionInput).toHaveValue(description);
    await expect(edit.programNameInput).not.toHaveValue(originalName);
  });

  // ---------------------------------------------------------------------------
  // Negative flows
  // ---------------------------------------------------------------------------

  test('TC-009 - Clearing Program Name disables Save', async ({ page }) => {
    const programName = `I.G. Empty Name ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. empty name test');

    const edit = await openEditModal(page, programName);

    await edit.fillProgramName('');
    await expect(edit.saveButton).toBeDisabled();

    // Pressing Enter while empty must not submit.
    await edit.focusProgramName();
    await page.keyboard.press('Enter');
    await expect(edit.dialog).toBeVisible();
    await expect(edit.saveButton).toBeDisabled();
  });

  test('TC-010 - Whitespace-only Program Name is treated as empty', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. Whitespace Name ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. whitespace name test');

    const edit = await openEditModal(page, programName);
    await edit.fillProgramName('   ');
    await expect(edit.saveButton).toBeDisabled();

    // A program literally named "   " must never appear in the list.
    await expect(programs.exactText('   ')).toHaveCount(0);
  });

  test('TC-011 - Cancel discards in-progress edits', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. Cancel Discard ${uniqueSuffix()}`;
    const originalDescription = 'I.G. cancel description';
    await createProgram(page, programName, originalDescription);

    let edit = await openEditModal(page, programName);
    await edit.fillProgramName(`I.G. DiscardMe ${uniqueSuffix()}`);
    await edit.clickCancel();

    await expect(edit.dialog).toBeHidden();
    // Row name in the list must still be the original.
    await expect(programs.row(programName)).toBeVisible();

    // Re-opening edit shows the previous (saved) values, not the abandoned draft.
    edit = await openEditModal(page, programName);
    await expect(edit.programNameInput).toHaveValue(programName);
    await expect(edit.descriptionInput).toHaveValue(originalDescription);
  });

  test('TC-012 - Server failure on save (5xx) does not update the list', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. Save 500 ${uniqueSuffix()}`;
    const originalDescription = 'I.G. server-failure precondition';
    await createProgram(page, programName, originalDescription);

    const attemptedNewName = `I.G. Save 500 Attempt ${uniqueSuffix()}`;

    // Mock only the PATCH /api/programs/:id (the save call). Leave POST
    // through so the precondition Create above still works.
    await page.route('**/api/programs/*', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Simulated server failure' }),
        });
        return;
      }
      await route.continue();
    });

    const edit = await openEditModal(page, programName);
    await edit.fillProgramName(attemptedNewName);
    await edit.clickSave();

    // Modal stays open with the user's edits intact.
    await expect(edit.dialog).toBeVisible();
    await expect(edit.programNameInput).toHaveValue(attemptedNewName);

    // Pre-edit values remain in the underlying list.
    await expect(programs.exactText(programName)).toHaveCount(1);
    await expect(programs.exactText(attemptedNewName)).toHaveCount(0);
  });

  // Requires two concurrent admin sessions to delete then save — out of
  // scope for a single-page test. Tracked under DS-4 (delete) integration.
  test.skip('TC-013 - Conflict / 404 when program was deleted by another user', async () => {
    // Manual or multi-context test: open the program in two browsers,
    // delete in B, attempt rename in A, expect 404/conflict UX.
  });

  // No non-admin credentials are provisioned in .env. Re-enable once
  // DIDAXIS_VIEWER_EMAIL / DIDAXIS_VIEWER_PASSWORD are available.
  test.skip('TC-014 - Non-admin user cannot edit programs (if role-gated)', async () => {
    // Requires a viewer-role login (e.g. qa-viewer@school.edu).
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  test('TC-015 - Editing to a name length of 255 chars succeeds', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. LongName Target ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. long-name precondition');

    const longName = 'P'.repeat(255);
    expect(longName).toHaveLength(255);

    const edit = await openEditModal(page, programName);
    await edit.fillProgramName(longName);
    await edit.clickSave();

    await expect(edit.dialog).toBeHidden();
    await expect(programs.exactText(longName)).toHaveCount(1);
  });

  test('TC-016 - Editing to special characters / Unicode preserves them exactly', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. Unicode Source ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. unicode precondition');

    const newName = `Renée's "Accelerated" Updated ${uniqueSuffix()}`;
    const edit = await openEditModal(page, programName);
    await edit.fillProgramName(newName);
    await edit.clickSave();

    await expect(edit.dialog).toBeHidden();
    await expect(programs.exactText(newName)).toHaveCount(1);
  });

  test('TC-017 - Editing to HTML-like text does not execute as script (XSS)', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. XSS Source ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. xss precondition');

    const xssName = `<img src=x onerror=alert(1)> ${uniqueSuffix()}`;

    // Fail loudly if the page tries to fire a native alert/confirm/prompt.
    const nativeDialogs: Dialog[] = [];
    page.on('dialog', (d) => {
      nativeDialogs.push(d);
      void d.dismiss();
    });

    let edit = await openEditModal(page, programName);
    await edit.fillProgramName(xssName);
    await edit.clickSave();

    await expect(edit.dialog).toBeHidden();
    await expect(programs.exactText(xssName)).toHaveCount(1);
    expect(nativeDialogs).toHaveLength(0);

    // Re-opening edit shows the same literal string.
    edit = await openEditModal(page, xssName);
    await expect(edit.programNameInput).toHaveValue(xssName);
  });

  // Reaching the "two rows sharing the same name" state requires a direct
  // DB seed (the Create flow now rejects duplicates per DS-3 AC3). Skip
  // until a fixture is available.
  test.skip('TC-018 - Editing one row of a duplicate-name pair targets only that row', async () => {
    // Pre-seed two programs with identical names via SQL/fixture, then edit
    // the second row and assert only that row is renamed.
  });

  test('TC-019 - Editing to a name that matches another program is rejected (DS-3 AC3)', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const suffix = uniqueSuffix();
    const nameA = `I.G. Existing A ${suffix}`;
    const nameB = `I.G. Existing B ${suffix}`;
    await createProgram(page, nameA, 'I.G. existing A description');
    await createProgram(page, nameB, 'I.G. existing B description');

    const edit = await openEditModal(page, nameB);
    await edit.fillProgramName(nameA);
    await edit.clickSave();

    // Save is rejected: modal stays open with the entered (conflicting) value.
    await expect(edit.dialog).toBeVisible();
    await expect(edit.programNameInput).toHaveValue(nameA);

    // List still contains exactly one row of each original name; no rename took effect.
    await expect(programs.exactText(nameA)).toHaveCount(1);
    await expect(programs.exactText(nameB)).toHaveCount(1);
  });

  test('TC-020 - Saving with no changes is a no-op', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. Noop Save ${uniqueSuffix()}`;
    const description = 'I.G. noop description';
    await createProgram(page, programName, description);

    const edit = await openEditModal(page, programName);
    // Change nothing.
    await edit.clickSave();

    await expect(edit.dialog).toBeHidden();
    const row = programs.row(programName);
    await expect(row).toBeVisible();
    await expect(row).toContainText(description);
  });

  test('TC-021 - Rapid double-click on Save does not create duplicate updates', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const suffix = uniqueSuffix();
    const originalName = `I.G. DoubleSave Source ${suffix}`;
    const newName = `I.G. DoubleSave Target ${suffix}`;
    await createProgram(page, originalName, 'I.G. double-save precondition');

    // Throttle PATCH so the user can race a second click against the first.
    let patchCount = 0;
    await page.route('**/api/programs/*', async (route) => {
      if (route.request().method() === 'PATCH') {
        patchCount++;
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      await route.continue();
    });

    const edit = await openEditModal(page, originalName);
    await edit.fillProgramName(newName);

    await Promise.all([
      edit.saveButton.click(),
      edit.saveButton.click({ force: true }).catch(() => {}),
    ]);

    await expect(edit.dialog).toBeHidden();
    await expect(programs.exactText(newName)).toHaveCount(1);
    await expect(programs.exactText(originalName)).toHaveCount(0);
    // Either the button was disabled in-flight, or the second click was de-duped.
    expect(patchCount).toBe(1);
  });

  test('TC-022 - Pressing Esc while editing focused on a field discards changes', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. Esc Discard ${uniqueSuffix()}`;
    const originalDescription = 'I.G. esc precondition';
    await createProgram(page, programName, originalDescription);

    let edit = await openEditModal(page, programName);
    await edit.fillProgramName(`I.G. EscDraft ${uniqueSuffix()}`);
    await page.keyboard.press('Escape');

    await expect(edit.dialog).toBeHidden();
    await expect(programs.row(programName)).toBeVisible();

    // Re-opening edit shows the original (pre-discard) values.
    edit = await openEditModal(page, programName);
    await expect(edit.programNameInput).toHaveValue(programName);
    await expect(edit.descriptionInput).toHaveValue(originalDescription);
  });
});
