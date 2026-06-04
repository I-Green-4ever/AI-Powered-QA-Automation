import type { Locator, Page } from '@playwright/test';

export class AppShell {
  readonly navigation: Locator;
  readonly dashboardNav: Locator;
  readonly programsNav: Locator;
  readonly signOutButton: Locator;

  constructor(readonly page: Page) {
    this.navigation = page.getByRole('navigation');
    this.dashboardNav = page.getByRole('button', { name: /Dashboard/ });
    this.programsNav = page.getByRole('button', { name: /Programs/ });
    this.signOutButton = page.getByRole('button', { name: 'Sign out' });
  }

  async goToDashboard(): Promise<void> {
    await this.dashboardNav.click();
  }

  async goToPrograms(): Promise<void> {
    await this.programsNav.click();
  }

  async signOut(): Promise<void> {
    await this.signOutButton.click();
  }
}
