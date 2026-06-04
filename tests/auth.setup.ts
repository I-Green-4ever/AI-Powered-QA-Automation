import { test as setup } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { AUTH_STORAGE_PATH, login } from '../lib/auth';

setup('authenticate as admin', async ({ page }) => {
  await login(page);
  await fs.promises.mkdir(path.dirname(AUTH_STORAGE_PATH), { recursive: true });
  await page.context().storageState({ path: AUTH_STORAGE_PATH });
});
