import type { Locator, Page } from '@playwright/test';

export class DashboardPage {
  readonly heading: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Dashboard' });
  }
}
