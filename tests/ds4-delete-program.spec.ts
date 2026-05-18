import { test, expect, type Page, type Locator } from '@playwright/test';
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

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(DIDAXIS_EMAIL);
  await page.getByLabel('Password').fill(DIDAXIS_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('button', { name: /Programs/ })).toBeVisible();
}

/**
 * Create a program through the UI so each Delete test has its own,
 * independent row to operate on (avoids cross-test pollution and ordering).
 */
async function createProgram(
  page: Page,
  name: string,
  description = ''
): Promise<void> {
  await page.goto('/programs');
  await page.getByRole('button', { name: '+ New Program' }).click();

  const dialog = page.getByRole('dialog', { name: 'New Program' });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('Program Name').fill(name);
  if (description) {
    await dialog.getByLabel('Description').fill(description);
  }
  await dialog.getByRole('button', { name: 'Create' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('row', { name })).toBeVisible();
}

/**
 * Locate the row for a given program name on the Programs page. Assumes
 * the page is already at /programs (callers can navigate first if needed).
 */
function programRow(page: Page, programName: string): Locator {
  return page.getByRole('row', { name: programName });
}

test.describe('DS-4 Delete Program (Didaxis Studio — AC-aligned)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ---------------------------------------------------------------------------
  // Positive flows
  // ---------------------------------------------------------------------------

  test('TC-001 - Clicking delete shows a confirmation dialog (AC1 verbatim)', async ({ page }) => {
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

    // Dismiss the confirmation so the row is NOT deleted in this test.
    const dialogTypes: string[] = [];
    page.once('dialog', async (d) => {
      dialogTypes.push(d.type());
      await d.dismiss();
    });

    const row = programRow(page, programName);
    await row.getByRole('button', { name: '🗑' }).click();

    // A confirmation dialog appeared and no delete was sent.
    expect(dialogTypes).toEqual(['confirm']);
    await expect(row).toBeVisible();
    expect(deleteCount).toBe(0);
  });

  test('TC-002 - Confirming deletion removes the program from the list (AC1 verbatim)', async ({ page }) => {
    const programName = `Test Program ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. confirm-removes precondition');

    const row = programRow(page, programName);
    page.once('dialog', (d) => void d.accept());
    await row.getByRole('button', { name: '🗑' }).click();

    // Row disappears immediately (no manual refresh) and stays gone.
    await expect(row).toBeHidden();
    await expect(programRow(page, programName)).toHaveCount(0);
  });

  test('TC-003 - Same flow on an admin-created I.G. row', async ({ page }) => {
    const programName = `I.G. Delete Me ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. ig-row precondition');

    const row = programRow(page, programName);
    page.once('dialog', (d) => void d.accept());
    await row.getByRole('button', { name: '🗑' }).click();

    await expect(row).toBeHidden();
    await expect(programRow(page, programName)).toHaveCount(0);
  });

  test('TC-004 - Deletion persists across navigation', async ({ page }) => {
    const programName = `I.G. Delete Me ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. persist precondition');

    page.once('dialog', (d) => void d.accept());
    await programRow(page, programName).getByRole('button', { name: '🗑' }).click();
    await expect(programRow(page, programName)).toHaveCount(0);

    // Round-trip via Dashboard to force a re-fetch from the server.
    await page.getByRole('button', { name: /Dashboard/ }).click();
    await page.getByRole('button', { name: /Programs/ }).click();

    await expect(programRow(page, programName)).toHaveCount(0);
  });

  test('TC-005 - Cancel via the dialog Cancel leaves the program intact (AC2 verbatim)', async ({ page }) => {
    const programName = `I.G. Keep Me ${uniqueSuffix()}`;
    const description = 'I.G. keep me description';
    await createProgram(page, programName, description);

    let deleteCount = 0;
    page.on('request', (req) => {
      if (req.method() === 'DELETE' && /\/api\/programs\//.test(req.url())) {
        deleteCount++;
      }
    });

    page.once('dialog', (d) => void d.dismiss());
    const row = programRow(page, programName);
    await row.getByRole('button', { name: '🗑' }).click();

    await expect(row).toBeVisible();
    await expect(row).toContainText(description);
    expect(deleteCount).toBe(0);
  });

  test('TC-006 - Cancel then confirm in a second attempt deletes the program', async ({ page }) => {
    const programName = `I.G. Keep Me ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. cancel-then-confirm precondition');

    const row = programRow(page, programName);

    // First click: cancel.
    page.once('dialog', (d) => void d.dismiss());
    await row.getByRole('button', { name: '🗑' }).click();
    await expect(row).toBeVisible();

    // Second click: accept. Demonstrates cancel does not lock the row.
    page.once('dialog', (d) => void d.accept());
    await row.getByRole('button', { name: '🗑' }).click();
    await expect(row).toBeHidden();
    await expect(programRow(page, programName)).toHaveCount(0);
  });

  test('TC-007 - Cancelling on one row does not affect other rows', async ({ page }) => {
    const suffix = uniqueSuffix();
    const targetName = `I.G. Cancel Target ${suffix}`;
    const untouchedName = `I.G. Untouched ${suffix}`;
    await createProgram(page, targetName, 'I.G. cancel target');
    await createProgram(page, untouchedName, 'I.G. untouched bystander');

    const targetRow = programRow(page, targetName);
    const untouchedRow = programRow(page, untouchedName);

    page.once('dialog', (d) => void d.dismiss());
    await targetRow.getByRole('button', { name: '🗑' }).click();

    await expect(targetRow).toBeVisible();
    await expect(untouchedRow).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Negative flows
  // ---------------------------------------------------------------------------

  test('TC-008 - Server failure (5xx) on confirmed delete keeps the program in the list', async ({ page }) => {
    const programName = `I.G. 500 Test ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. 500 precondition');

    // Mock only DELETE — leave POST through so the precondition Create works.
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

    const row = programRow(page, programName);
    page.once('dialog', (d) => void d.accept());
    await row.getByRole('button', { name: '🗑' }).click();

    // Server rejected the delete → row must still be present after the response.
    // Reload to force a re-fetch from the server (source of truth).
    await page.goto('/programs');
    await expect(programRow(page, programName)).toBeVisible();
  });

  test('TC-009 - Network timeout does not optimistically remove the program permanently', async ({ page }) => {
    const programName = `I.G. Timeout ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. timeout precondition');

    // Simulate a network timeout on DELETE.
    await page.route('**/api/programs/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.abort('timedout');
        return;
      }
      await route.continue();
    });

    const row = programRow(page, programName);
    page.once('dialog', (d) => void d.accept());
    await row.getByRole('button', { name: '🗑' }).click();

    // Either the row never hid, or it re-appeared after the failed timeout.
    // Reload to take server state as the ground truth.
    await page.goto('/programs');
    await expect(programRow(page, programName)).toBeVisible();
  });

  // Requires a non-admin login (e.g. qa-viewer@school.edu). Re-enable once
  // DIDAXIS_VIEWER_EMAIL / DIDAXIS_VIEWER_PASSWORD are provisioned in .env.
  test.skip('TC-010 - Non-admin user cannot delete programs (if role-gated)', async () => {
    // With viewer creds: navigate to /programs, confirm 🗑 is hidden, or
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
    // For the current native-confirm implementation, `dialog.dismiss()` is
    // equivalent to clicking Cancel — and that is the only safe default
    // for any non-confirm interaction (Esc / backdrop / X on a custom modal).
    const programName = `I.G. EscClose ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. esc-close precondition');

    let deleteCount = 0;
    page.on('request', (req) => {
      if (req.method() === 'DELETE' && /\/api\/programs\//.test(req.url())) {
        deleteCount++;
      }
    });

    page.once('dialog', (d) => void d.dismiss());
    const row = programRow(page, programName);
    await row.getByRole('button', { name: '🗑' }).click();

    await expect(row).toBeVisible();
    expect(deleteCount).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  test('TC-013 - HTML-like text in program name is rendered as plain text in the confirmation (no XSS)', async ({ page }) => {
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
        // An alert here would indicate the XSS payload executed — fail loudly.
        await d.dismiss();
      }
    });

    const row = programRow(page, programName);
    await row.getByRole('button', { name: '🗑' }).click();

    await expect(row).toBeHidden();
    // No native alert fired from the embedded onerror=alert(1).
    expect(dialogTypes).toEqual(['confirm']);
    // The literal name appears in the confirm message text.
    expect(confirmMessage ?? '').toContain('<img src=x onerror=alert(1)>');
  });

  test('TC-014 - Special characters and Unicode in program name appear in the confirmation dialog', async ({ page }) => {
    const programName = `I.G. Renée's "Accelerated" Program ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. unicode-dialog precondition');

    let confirmMessage: string | undefined;
    page.once('dialog', async (d) => {
      confirmMessage = d.message();
      await d.accept();
    });

    const row = programRow(page, programName);
    await row.getByRole('button', { name: '🗑' }).click();

    await expect(row).toBeHidden();
    // Apostrophe, smart quotes, and accented characters render exactly.
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
    // PRODUCT POLICY ASSUMPTION (pairs with DS-3 TC-011, ambiguity #4):
    // duplicate check operates on ACTIVE programs only — deleted names are
    // free to re-use.
    const programName = `I.G. Reusable ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. first incarnation');

    page.once('dialog', (d) => void d.accept());
    await programRow(page, programName).getByRole('button', { name: '🗑' }).click();
    await expect(programRow(page, programName)).toHaveCount(0);

    // Re-create with the same name — must succeed.
    await createProgram(page, programName, 'I.G. second incarnation');
    await expect(programRow(page, programName)).toBeVisible();
  });

  test('TC-018 - Long program name (255 chars) is handled gracefully in the confirmation dialog', async ({ page }) => {
    // "I.G. " (5) + 250 × "P" = 255 chars total.
    const programName = `I.G. ${'P'.repeat(250)}`;
    expect(programName).toHaveLength(255);
    await createProgram(page, programName, 'I.G. long-name precondition');

    let confirmMessage: string | undefined;
    page.once('dialog', async (d) => {
      confirmMessage = d.message();
      await d.accept();
    });

    const row = programRow(page, programName);
    await row.getByRole('button', { name: '🗑' }).click();

    await expect(row).toBeHidden();
    // The full name is present in the confirm message (truncation in display UI is OK).
    expect(confirmMessage ?? '').toContain(programName);
  });

  test('TC-019 - Rapid double-activation of delete does not produce duplicate dialogs / requests', async ({ page }) => {
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

    const row = programRow(page, programName);
    const trashBtn = row.getByRole('button', { name: '🗑' });

    // Click twice in quick succession. The second click may no-op once the
    // row is detached after the first delete completes.
    await Promise.all([
      trashBtn.click(),
      trashBtn.click({ force: true }).catch(() => {}),
    ]);

    await expect(row).toBeHidden();
    // Exactly one confirmation and exactly one DELETE request.
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
    const programName = `I.G. Obsolete ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. obsolete precondition');

    page.once('dialog', (d) => void d.accept());
    await programRow(page, programName).getByRole('button', { name: '🗑' }).click();
    await expect(programRow(page, programName)).toHaveCount(0);

    await page.getByRole('button', { name: /Dashboard/ }).click();
    await page.getByRole('button', { name: /Programs/ }).click();

    await expect(programRow(page, programName)).toHaveCount(0);
  });

  test('TC-022 - Keyboard activation: focus + Enter on the delete control opens the same dialog', async ({ page }) => {
    const programName = `I.G. Keyboard ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. keyboard precondition');

    const dialogTypes: string[] = [];
    page.once('dialog', async (d) => {
      dialogTypes.push(d.type());
      await d.accept();
    });

    const row = programRow(page, programName);
    const trashBtn = row.getByRole('button', { name: '🗑' });
    await trashBtn.focus();
    await page.keyboard.press('Enter');

    await expect(row).toBeHidden();
    // Same confirmation flow as TC-001 (mouse path), reached via keyboard.
    expect(dialogTypes).toEqual(['confirm']);
  });
});
