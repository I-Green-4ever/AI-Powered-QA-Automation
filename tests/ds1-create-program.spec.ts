import { test, expect, type Page } from '@playwright/test';
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

  // Wait for an authenticated landmark instead of just a URL change.
  await expect(page.getByRole('button', { name: /Programs/ })).toBeVisible();
}

test.describe('Create Program (Didaxis Studio)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('TC-001 - Navigate to program creation form', async ({ page }) => {
    await page.goto('/programs');

    await page.getByRole('button', { name: '+ New Program' }).click();

    const dialog = page.getByRole('dialog', { name: 'New Program' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Program Name')).toBeVisible();
    await expect(dialog.getByLabel('Description')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  test('TC-002 - Successfully create a program with valid data', async ({ page }) => {
    const programName = `IG - Web Development ${uniqueSuffix()}`;
    const programDescription = 'IG - Full-stack web development program';

    await page.goto('/programs');
    await page.getByRole('button', { name: '+ New Program' }).click();

    const dialog = page.getByRole('dialog', { name: 'New Program' });
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('Program Name').fill(programName);
    await dialog.getByLabel('Description').fill(programDescription);
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(dialog).toBeHidden();
    // Pass programName as a plain string so Playwright does literal
    // substring matching against the row's accessible name. A RegExp
    // would treat brackets/slashes in the name as metacharacters.
    await expect(
      page.getByRole('row', { name: programName })
    ).toBeVisible();
  });
});
