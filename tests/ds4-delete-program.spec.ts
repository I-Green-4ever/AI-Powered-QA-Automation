import { test, expect } from '../fixtures/cleanup.fixture';
import { createProgram } from './helpers/program';
import { ProgramsPage } from '../pages/programs.page';
import { AppShell } from '../pages/app-shell.page';
import { format } from 'date-fns';

/**
 * Build a unique, human-readable suffix for test data so each run produces
 * fresh program names that don't collide with previous runs or seed data.
 * Shape: "dd/MMM/yyyy [hh:mm:ss]" e.g. "17/May/2026 [19:32:45]".
 */
function uniqueSuffix(): string {
  const now = new Date();
  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  const ss = now.getSeconds().toString().padStart(2, '0');

  const timeString = `${hh}:${mm}:${ss}`;

  return `${format(now, 'dd/MMM/yyyy')} [${timeString}]`;
}

test.describe('DS-4 Delete Program (Didaxis Studio — AC-aligned)', () => {
  // ---------------------------------------------------------------------------
  // Positive flows
  // ---------------------------------------------------------------------------

  test('TC-001 - Clicking delete shows a confirmation dialog (AC1 verbatim)', async ({ page }) => {
    const programs = new ProgramsPage(page);
    // AC1 uses the literal name "Test Program". Suffix-tag for run isolation.
    const programName = `Test Program ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. confirmation precondition');

    // Spy on DELETE traffic — none should fire until the user confirms.
    let deleteCount = 0;
    page.on('request', (req) => {
      if (req.method() === 'DELETE' && /\/api\/programs\//.test(req.url())) {
        deleteCount++;
      }
    });

    const dialogTypes: string[] = [];
    page.once('dialog', async (d) => {
      dialogTypes.push(d.type());
      await d.dismiss();
    });

    const row = programs.programRow(programName);
    await row.clickDelete();

    expect(dialogTypes).toEqual(['confirm']);
    await expect(row.row).toBeVisible();
    expect(deleteCount).toBe(0);
  });

  test('TC-002 - Confirming deletion removes the program from the list (AC1 verbatim)', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `Test Program ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. confirm-removes precondition');

    const row = programs.programRow(programName);
    await row.clickDeleteAccept();

    await expect(row.row).toBeHidden();
    await expect(programs.row(programName)).toHaveCount(0);
  });

  test('TC-003 - Same flow on an admin-created I.G. row', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. Delete Me ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. ig-row precondition');

    const row = programs.programRow(programName);
    await row.clickDeleteAccept();

    await expect(row.row).toBeHidden();
    await expect(programs.row(programName)).toHaveCount(0);
  });

  test('TC-004 - Deletion persists across navigation', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const shell = new AppShell(page);
    const programName = `I.G. Delete Me ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. persist precondition');

    await programs.programRow(programName).clickDeleteAccept();
    await expect(programs.row(programName)).toHaveCount(0);

    await shell.goToDashboard();
    await shell.goToPrograms();

    await expect(programs.row(programName)).toHaveCount(0);
  });

  test('TC-005 - Cancel via the dialog Cancel leaves the program intact (AC2 verbatim)', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. Keep Me ${uniqueSuffix()}`;
    const description = 'I.G. keep me description';
    await createProgram(page, programName, description);

    let deleteCount = 0;
    page.on('request', (req) => {
      if (req.method() === 'DELETE' && /\/api\/programs\//.test(req.url())) {
        deleteCount++;
      }
    });

    const row = programs.programRow(programName);
    await row.clickDeleteDismiss();

    await expect(row.row).toBeVisible();
    await expect(row.row).toContainText(description);
    expect(deleteCount).toBe(0);
  });

  test('TC-006 - Cancel then confirm in a second attempt deletes the program', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. Keep Me ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. cancel-then-confirm precondition');

    const row = programs.programRow(programName);

    await row.clickDeleteDismiss();
    await expect(row.row).toBeVisible();

    await row.clickDeleteAccept();
    await expect(row.row).toBeHidden();
    await expect(programs.row(programName)).toHaveCount(0);
  });

  test('TC-007 - Cancelling on one row does not affect other rows', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const suffix = uniqueSuffix();
    const targetName = `I.G. Cancel Target ${suffix}`;
    const untouchedName = `I.G. Untouched ${suffix}`;
    await createProgram(page, targetName, 'I.G. cancel target');
    await createProgram(page, untouchedName, 'I.G. untouched bystander');

    const targetRow = programs.programRow(targetName);
    const untouchedRow = programs.programRow(untouchedName);

    await targetRow.clickDeleteDismiss();

    await expect(targetRow.row).toBeVisible();
    await expect(untouchedRow.row).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Negative flows
  // ---------------------------------------------------------------------------

  test('TC-008 - Server failure (5xx) on confirmed delete keeps the program in the list', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. 500 Test ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. 500 precondition');

    await page.route('**/api/programs/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Simulated server failure' }),
        });
        return;
      }
      await route.continue();
    });

    await programs.programRow(programName).clickDeleteAccept();

    await programs.goto();
    await expect(programs.row(programName)).toBeVisible();
  });

  test('TC-009 - Network timeout does not optimistically remove the program permanently', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. Timeout ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. timeout precondition');

    await page.route('**/api/programs/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.abort('timedout');
        return;
      }
      await route.continue();
    });

    await programs.programRow(programName).clickDeleteAccept();

    await programs.goto();
    await expect(programs.row(programName)).toBeVisible();
  });

  // Requires a non-admin login (e.g. qa-viewer@school.edu). Re-enable once
  // DIDAXIS_VIEWER_EMAIL / DIDAXIS_VIEWER_PASSWORD are provisioned in .env.
  test.skip('TC-010 - Non-admin user cannot delete programs (if role-gated)', async () => {
    // With viewer creds: navigate to /programs, confirm delete control is hidden, or
    // attempt delete and expect HTTP 403 + row unchanged.
  });

  // Requires two concurrent admin sessions. Out of scope for a single-page
  // test; documented for an integration-tier run with two browser contexts.
  test.skip('TC-011 - Conflict / 404 when the program was already deleted by another admin', async () => {
    // In B, delete the program (confirm). In A, click delete on the same
    // row, confirm, expect 404 / "no longer exists" UX, and the row
    // disappears from A after re-fetch. No crash, no phantom success.
  });

  test('TC-012 - Dismissing the confirmation without explicit Cancel does not delete', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. EscClose ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. esc-close precondition');

    let deleteCount = 0;
    page.on('request', (req) => {
      if (req.method() === 'DELETE' && /\/api\/programs\//.test(req.url())) {
        deleteCount++;
      }
    });

    const row = programs.programRow(programName);
    await row.clickDeleteDismiss();

    await expect(row.row).toBeVisible();
    expect(deleteCount).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  test('TC-013 - HTML-like text in program name is rendered as plain text in the confirmation (no XSS)', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. <img src=x onerror=alert(1)> ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. xss precondition');

    const dialogTypes: string[] = [];
    let confirmMessage: string | undefined;
    page.on('dialog', async (d) => {
      dialogTypes.push(d.type());
      if (d.type() === 'confirm') {
        confirmMessage = d.message();
        await d.accept();
      } else {
        await d.dismiss();
      }
    });

    const row = programs.programRow(programName);
    await row.clickDelete();

    await expect(row.row).toBeHidden();
    expect(dialogTypes).toEqual(['confirm']);
    expect(confirmMessage ?? '').toContain('<img src=x onerror=alert(1)>');
  });

  test('TC-014 - Special characters and Unicode in program name appear in the confirmation dialog', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. Renée's "Accelerated" Program ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. unicode-dialog precondition');

    let confirmMessage: string | undefined;
    page.once('dialog', async (d) => {
      confirmMessage = d.message();
      await d.accept();
    });

    const row = programs.programRow(programName);
    await row.clickDelete();

    await expect(row.row).toBeHidden();
    expect(confirmMessage ?? '').toContain(programName);
  });

  // Reliably reaching a 0-program state requires tenant isolation; the
  // shared test tenant has too many residual rows to drain deterministically.
  // The Block 4 stricter regression suite covers exact empty-state copy.
  test.skip('TC-015 - Deleting the last program reveals an empty state', async () => {
    // Per-tenant or fixture-reset run only.
  });

  // Reaching the duplicate-row state requires direct DB seeding; the live
  // Create flow rejects duplicates per DS-3 AC3.
  test.skip('TC-016 - Deleting one row of a legacy duplicate-name pair removes only that row', async () => {
    // Pre-seed two rows with identical names, then delete the second only.
  });

  test('TC-017 - Name freed by delete is re-usable in a subsequent Create', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. Reusable ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. first incarnation');

    await programs.programRow(programName).clickDeleteAccept();
    await expect(programs.row(programName)).toHaveCount(0);

    await createProgram(page, programName, 'I.G. second incarnation');
    await expect(programs.row(programName)).toBeVisible();
  });

  test('TC-018 - Long program name (255 chars) is handled gracefully in the confirmation dialog', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. ${'P'.repeat(250)}`;
    expect(programName).toHaveLength(255);
    await createProgram(page, programName, 'I.G. long-name precondition');

    let confirmMessage: string | undefined;
    page.once('dialog', async (d) => {
      confirmMessage = d.message();
      await d.accept();
    });

    const row = programs.programRow(programName);
    await row.clickDelete();

    await expect(row.row).toBeHidden();
    expect(confirmMessage ?? '').toContain(programName);
  });

  test('TC-019 - Rapid double-activation of delete does not produce duplicate dialogs / requests', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. DoubleDelete ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. double-delete precondition');

    let dialogCount = 0;
    let deleteCount = 0;
    page.on('dialog', async (d) => {
      dialogCount++;
      await d.accept();
    });
    page.on('request', (req) => {
      if (req.method() === 'DELETE' && /\/api\/programs\//.test(req.url())) {
        deleteCount++;
      }
    });

    const row = programs.programRow(programName);
    const deleteBtn = row.deleteButton;

    await Promise.all([
      deleteBtn.click(),
      deleteBtn.click({ force: true }).catch(() => {}),
    ]);

    await expect(row.row).toBeHidden();
    expect(dialogCount).toBe(1);
    expect(deleteCount).toBe(1);
  });

  // Requires two concurrent admin sessions deleting the same row. Out of
  // scope for a single-page test.
  test.skip('TC-020 - Concurrent confirmed deletes from two sessions on the same program', async () => {
    // Use two browser.newContext() sessions deleting at nearly the same
    // time; one returns 200, the other 404/no-op; both lists converge.
  });

  test('TC-021 - After delete success, navigating away and back still shows program absent', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const shell = new AppShell(page);
    const programName = `I.G. Obsolete ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. obsolete precondition');

    await programs.programRow(programName).clickDeleteAccept();
    await expect(programs.row(programName)).toHaveCount(0);

    await shell.goToDashboard();
    await shell.goToPrograms();

    await expect(programs.row(programName)).toHaveCount(0);
  });

  test('TC-022 - Keyboard activation: focus + Enter on the delete control opens the same dialog', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. Keyboard ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. keyboard precondition');

    const dialogTypes: string[] = [];
    page.once('dialog', async (d) => {
      dialogTypes.push(d.type());
      await d.accept();
    });

    const row = programs.programRow(programName);
    await row.deleteButton.focus();
    await page.keyboard.press('Enter');

    await expect(row.row).toBeHidden();
    expect(dialogTypes).toEqual(['confirm']);
  });
});
