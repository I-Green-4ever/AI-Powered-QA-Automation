import type { Locator, Page } from '@playwright/test';

export class ProgramRow {
  readonly row: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;

  constructor(
    readonly page: Page,
    readonly programName: string
  ) {
    this.editButton = page.getByRole('button', {
      name: `Edit ${programName}`,
    });
    this.deleteButton = page.getByRole('button', {
      name: `Delete ${programName}`,
    });
    this.row = page.getByRole('row').filter({ has: this.editButton });
  }

  async select(): Promise<void> {
    await this.row.getByText(this.programName, { exact: true }).click();
  }

  async clickEdit(): Promise<void> {
    await this.editButton.click();
  }

  async clickDelete(): Promise<void> {
    await this.deleteButton.click();
  }

  async clickDeleteAccept(): Promise<void> {
    this.page.once('dialog', (d) => void d.accept());
    await this.clickDelete();
  }

  async clickDeleteDismiss(): Promise<void> {
    this.page.once('dialog', (d) => void d.dismiss());
    await this.clickDelete();
  }

  async clickDeleteAndCaptureMessage(): Promise<string> {
    let message = '';
    this.page.once('dialog', async (d) => {
      message = d.message();
      await d.dismiss();
    });
    await this.clickDelete();
    return message;
  }
}
