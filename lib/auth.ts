import { expect, type Page } from '@playwright/test';
import path from 'path';
import { LoginPage } from '../pages/login.page';
import { AppShell } from '../pages/app-shell.page';

/** Saved session for reuse across tests (gitignored). */
export const AUTH_STORAGE_PATH = path.join(
  __dirname,
  '../playwright/.auth/user.json'
);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing env var "${name}". Set it in the .env file at the project root.`
    );
  }
  return value;
}

/**
 * Sign in via the Didaxis login page and wait for an authenticated landmark.
 * Used by auth.setup.ts; tests should rely on storageState instead.
 */
export async function login(page: Page): Promise<void> {
  const email = requireEnv('DIDAXIS_EMAIL');
  const password = requireEnv('DIDAXIS_PASSWORD');

  const loginPage = new LoginPage(page);
  await loginPage.signIn(email, password);
  await expect(new AppShell(page).programsNav).toBeVisible();
}
