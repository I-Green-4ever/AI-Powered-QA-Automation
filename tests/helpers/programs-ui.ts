import { expect, type Page } from '@playwright/test';
import { ProgramsPage } from '../../pages/programs.page';
import type { NewProgramModal } from '../../pages/components/new-program.modal';
import type { EditProgramModal } from '../../pages/components/edit-program.modal';

export async function openNewProgramModal(page: Page): Promise<NewProgramModal> {
  const programs = new ProgramsPage(page);
  await programs.goto();
  const modal = await programs.openNewProgram();
  await expect(modal.dialog).toBeVisible();
  return modal;
}

export async function openEditModal(
  page: Page,
  programName: string
): Promise<EditProgramModal> {
  const programs = new ProgramsPage(page);
  await programs.goto();
  const row = programs.programRow(programName);
  await expect(row.row).toBeVisible();
  await row.clickEdit();
  await expect(programs.editProgram.dialog).toBeVisible();
  return programs.editProgram;
}
