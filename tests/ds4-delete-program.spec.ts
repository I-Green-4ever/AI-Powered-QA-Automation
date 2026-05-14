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

function programsRow(page: Page, programName: string): Locator {
  return page.getByRole('row', { name: programName });
}

function expectedDeleteConfirmMessage(programName: string): string {
  return `Delete program "${programName}"? All its semesters and courses will be removed. This cannot be undone.`;
}

/** Program rows from Playwright MCP accessibility snapshot: tbody rows with 🗑 delete control. */
function programDataRows(page: Page): Locator {
  return page.getByRole('row').filter({ has: page.getByRole('button', { name: '🗑' }) });
}

/**
 * Deletes every program whose displayed name or description text is longer than 25 characters.
 * Uses row-scoped locators from MCP snapshot: first cell holds two paragraphs (name, description).
 */
async function deleteProgramsWithLongNameOrDescription(page: Page): Promise<void> {
  await page.goto('/programs');
  await expect(page.getByRole('heading', { name: 'Programs' })).toBeVisible();

  const maxPasses = 80;
  for (let pass = 0; pass < maxPasses; pass++) {
    const rows = programDataRows(page);
    const count = await rows.count();
    let deletedOne = false;

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const firstCell = row.locator('td').first();
      const paras = firstCell.locator('p');
      const nameText = (await paras.nth(0).innerText()).trim();
      const descText =
        (await paras.nth(1).count()) > 0
          ? (await paras.nth(1).innerText()).trim()
          : '';

      if (nameText.length <= 25 && descText.length <= 25) {
        continue;
      }

      page.once('dialog', (dialog) => {
        void dialog.accept();
      });
      await row.getByRole('button', { name: '🗑' }).click();
      await expect(row).toBeHidden({ timeout: 20_000 });
      deletedOne = true;
      break;
    }

    if (!deletedOne) {
      return;
    }
  }

  throw new Error(
    'deleteProgramsWithLongNameOrDescription: stopped after max passes — list may still contain long fields.'
  );
}

async function createProgram(
  page: Page,
  programName: string,
  programDescription: string
): Promise<void> {
  await page.goto('/programs');
  await page.getByRole('button', { name: '+ New Program' }).click();

  const dialog = page.getByRole('dialog', { name: 'New Program' });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('Program Name').fill(programName);
  await dialog.getByLabel('Description').fill(programDescription);
  await dialog.getByRole('button', { name: 'Create' }).click();

  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('row', { name: `${programName} ${programDescription}` })
  ).toBeVisible();
}

async function confirmDeleteProgramRow(page: Page, row: Locator): Promise<void> {
  const responsePromise = page.waitForResponse(
    (res) => {
      const method = res.request().method();
      if (method !== 'DELETE' && method !== 'POST') {
        return false;
      }
      return res.ok() && /program/i.test(res.url());
    },
    { timeout: 25_000 }
  );

  page.once('dialog', (dialog) => void dialog.accept());

  await Promise.all([responsePromise, row.getByRole('button', { name: '🗑' }).click()]);
}

test.describe.configure({ mode: 'serial' });

test.describe('Delete Program (Didaxis Studio)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('TC-001 - Deleting a program succeeds after confirming native dialog', async ({ page }) => {
    const programName = `IG - Del TC001 ${uniqueSuffix()}`;
    const programDescription = 'IG - short';

    await createProgram(page, programName, programDescription);

    const row = programsRow(page, programName);
    await expect(row).toBeVisible();

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toBe(expectedDeleteConfirmMessage(programName));
      await dialog.accept();
    });

    await row.getByRole('button', { name: '🗑' }).click();

    await expect(row).toBeHidden();
  });

  test('TC-002 - Cancelling deletion leaves the program unchanged', async ({ page }) => {
    const programName = `IG - Del TC002 ${uniqueSuffix()}`;
    const programDescription = 'IG - cancel';

    await createProgram(page, programName, programDescription);

    const row = programsRow(page, programName);

    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toBe(expectedDeleteConfirmMessage(programName));
      await dialog.dismiss();
    });

    await row.getByRole('button', { name: '🗑' }).click();

    await expect(row).toBeVisible();
    await expect(programsRow(page, programName)).toBeVisible();
  });

  test('TC-003 - Confirm delete removes program whose name contains quotes or apostrophe', async ({
    page,
  }) => {
    const programName = `Renée's "Accelerated" ${uniqueSuffix()}`;
    const programDescription = 'IG - short';

    await createProgram(page, programName, programDescription);

    const row = programsRow(page, programName);

    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain(programName);
      await dialog.accept();
    });

    await row.getByRole('button', { name: '🗑' }).click();

    await expect(row).toBeHidden();
  });

  test('TC-004 - Confirm delete removes program at max reasonable name length', async ({ page }) => {
    const longName = `P`.repeat(255);
    const programDescription = 'IG - short';

    await createProgram(page, longName, programDescription);

    const row = programsRow(page, longName);

    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Delete program');
      await dialog.accept();
    });

    await row.getByRole('button', { name: '🗑' }).click();

    await expect(row).toBeHidden();
  });

  test('TC-005 - Empty state after deleting the last remaining program', async () => {
    test.skip(
      true,
      'TC-005 needs an empty tenant after deleting the sole remaining program. The live programs grid is virtualized, so automated drains against shared environments are unreliable; exercise TC-005 manually or with tenant isolation.'
    );
  });

  test('TC-006 - After delete success, navigating away and back still shows program absent', async ({
    page,
  }) => {
    const programName = `IG - Del TC006 ${uniqueSuffix()}`;
    await createProgram(page, programName, 'IG - obsolete');

    const row = programsRow(page, programName);
    page.once('dialog', (dialog) => void dialog.accept());
    await row.getByRole('button', { name: '🗑' }).click();
    await expect(row).toBeHidden();

    await page.getByRole('button', { name: /Dashboard/ }).click();
    await page.getByRole('button', { name: /Programs/ }).click();

    await expect(programsRow(page, programName)).toHaveCount(0);
  });

  test('TC-012 - Program name with HTML-like text does not execute script; cancel keeps row', async ({
    page,
  }) => {
    const programName = '`<img src=x onerror=alert(1)>` Program ' + uniqueSuffix();
    await createProgram(page, programName, 'IG - short');

    const row = programsRow(page, programName);

    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('<img src=x onerror=alert(1)>');
      await dialog.dismiss();
    });

    await row.getByRole('button', { name: '🗑' }).click();

    await expect(row).toBeVisible();
    page.once('dialog', (dialog) => void dialog.accept());
    await row.getByRole('button', { name: '🗑' }).click();
    await expect(row).toBeHidden();
  });

  test('TC-013 - Duplicate display names: deleting second row only removes one program', async ({
    page,
  }) => {
    const dupName = `Duplicate Name ${uniqueSuffix()}`;
    await createProgram(page, dupName, 'IG - first');
    await createProgram(page, dupName, 'IG - second');

    const matches = programsRow(page, dupName);
    await expect(matches).toHaveCount(2);

    const secondRow = matches.nth(1);

    page.once('dialog', (dialog) => void dialog.accept());
    await secondRow.getByRole('button', { name: '🗑' }).click();
    await expect(secondRow).toBeHidden();

    await expect(programsRow(page, dupName)).toHaveCount(1);

    const remaining = programsRow(page, dupName).first();
    const remainingDesc = (
      await remaining.locator('td').first().locator('p').nth(1).innerText()
    ).trim();
    expect(['IG - first', 'IG - second']).toContain(remainingDesc);

    page.once('dialog', (dialog) => void dialog.accept());
    await remaining.getByRole('button', { name: '🗑' }).click();
    await expect(remaining).toBeHidden();
  });

  test('TC-015 - Cancel then delete same program still works', async ({ page }) => {
    const programName = `IG - Del TC015 ${uniqueSuffix()}`;
    await createProgram(page, programName, 'IG - try again');

    const row = programsRow(page, programName);

    page.once('dialog', (dialog) => void dialog.dismiss());
    await row.getByRole('button', { name: '🗑' }).click();
    await expect(row).toBeVisible();

    await confirmDeleteProgramRow(page, row);
    await expect(row).toBeHidden();
  });

});
