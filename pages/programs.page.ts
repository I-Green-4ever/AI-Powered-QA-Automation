import type { Locator, Page } from '@playwright/test';
import { NewProgramModal } from './components/new-program.modal';
import { EditProgramModal } from './components/edit-program.modal';
import { ProgramRow } from './components/program-row';

export class ProgramsPage {
  readonly heading: Locator;
  readonly newProgramButton: Locator;
  readonly newProgramButtonAlt: Locator;
  readonly table: Locator;
  readonly dataRows: Locator;
  readonly emptyStateHint: Locator;
  readonly errorHint: Locator;
  readonly newProgram: NewProgramModal;
  readonly editProgram: EditProgramModal;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Programs' });
    this.newProgramButton = page.getByRole('button', { name: '+ New Program' });
    this.newProgramButtonAlt = page.getByRole('button', {
      name: /\+ ?New Program|Create Program|Create program/,
    });
    this.table = page.getByRole('table');
    this.dataRows = page
      .getByRole('row')
      .filter({ has: page.getByRole('button', { name: /^Delete / }) });
    this.emptyStateHint = page.getByText(
      /no programs|create your first|get started/i
    );
    this.errorHint = page.getByText(
      /error|failed|something went wrong|try again/i
    );
    this.newProgram = new NewProgramModal(page);
    this.editProgram = new EditProgramModal(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/programs');
  }

  async openNewProgram(): Promise<NewProgramModal> {
    await this.newProgramButton.click();
    return this.newProgram;
  }

  programRow(programName: string): ProgramRow {
    return new ProgramRow(this.page, programName);
  }

  /** Row scoped by the unique per-row Edit control. */
  row(programName: string): Locator {
    return this.programRow(programName).row;
  }

  exactText(name: string): Locator {
    return this.page.getByText(name, { exact: true });
  }
}
