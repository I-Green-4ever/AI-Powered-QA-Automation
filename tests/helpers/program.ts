import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { waitForProgramCreate } from '../../lib/program-tracker';

/** Click Create and track the new program UUID from POST /api/programs. */
export async function clickCreateAndTrack(
  page: Page,
  dialog: Locator
): Promise<string> {
  const idPromise = waitForProgramCreate(page);
  await dialog.getByRole('button', { name: 'Create' }).click();
  return idPromise;
}

/** Create a program via the UI and track its UUID for API cleanup. */
export async function createProgram(
  page: Page,
  name: string,
  description = ''
): Promise<string> {
  await page.goto('/programs');
  await page.getByRole('button', { name: '+ New Program' }).click();

  const dialog = page.getByRole('dialog', { name: 'New Program' });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('Program Name').fill(name);
  if (description) {
    await dialog.getByLabel('Description').fill(description);
  }

  const id = await clickCreateAndTrack(page, dialog);
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('row', { name })).toBeVisible();
  return id;
}
