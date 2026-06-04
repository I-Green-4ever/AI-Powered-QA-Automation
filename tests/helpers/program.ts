import { expect, type Page } from '@playwright/test';
import { waitForProgramCreate } from '../../lib/program-tracker';
import { ProgramsPage } from '../../pages/programs.page';
import type { NewProgramModal } from '../../pages/components/new-program.modal';

/** Click Create and track the new program UUID from POST /api/programs. */
export async function clickCreateAndTrack(
  page: Page,
  modal: NewProgramModal
): Promise<string> {
  const idPromise = waitForProgramCreate(page);
  await modal.clickCreate();
  return idPromise;
}

/** Create a program via the UI and track its UUID for API cleanup. */
export async function createProgram(
  page: Page,
  name: string,
  description = ''
): Promise<string> {
  const programs = new ProgramsPage(page);
  await programs.goto();
  const modal = await programs.openNewProgram();
  await expect(modal.dialog).toBeVisible();

  await modal.fillProgramName(name);
  if (description) {
    await modal.fillDescription(description);
  }

  const id = await clickCreateAndTrack(page, modal);
  await expect(modal.dialog).toBeHidden();
  await expect(programs.row(name)).toBeVisible();
  return id;
}
