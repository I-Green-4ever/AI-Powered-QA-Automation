import { randomUUID } from 'node:crypto';
import type { Page, Request } from '@playwright/test';
import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/programs.page';
import type { NewProgramModal } from '../pages/components/new-program.modal';
import { clickCreateAndTrack } from './helpers/program';
import { openNewProgramModal } from './helpers/programs-ui';

const PROGRAM_NAME_BASE = 'Web Development 2026';

function uniqueProgramName(): string {
  return `${PROGRAM_NAME_BASE} [${randomUUID()}]`;
}

function observeProgramCreateRequests(page: Page): {
  count: () => number;
  close: () => void;
} {
  let postCount = 0;
  const onRequest = (request: Request): void => {
    if (
      request.method() === 'POST' &&
      /\/api\/programs\/?(?:\?|$)/.test(request.url())
    ) {
      postCount++;
    }
  };

  page.on('request', onRequest);
  return {
    count: () => postCount,
    close: () => page.off('request', onRequest),
  };
}

test.describe('DS-1 Create new academic program', () => {
  // Happy paths

  test('TC-001 - Open the program creation form', async ({ page }) => {
    const modal: NewProgramModal = await openNewProgramModal(page);

    await expect(modal.dialog).toBeVisible();
    await expect(modal.programNameInput).toBeVisible();
    await expect(modal.descriptionInput).toBeVisible();
  });

  test('TC-002 - Create Web Development 2026', async ({ page }) => {
    const programName = uniqueProgramName();
    const programDescription = 'Full-stack web development program';
    const programs = new ProgramsPage(page);
    const modal: NewProgramModal = await openNewProgramModal(page);

    await modal.fillProgramName(programName);
    await modal.fillDescription(programDescription);
    await clickCreateAndTrack(page, modal);

    await expect(modal.dialog).toBeHidden();
    const row = programs.row(programName);
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(programDescription);
  });

  // Negative

  test('TC-003 - Disable Create when Program Name is empty', async ({
    page,
  }) => {
    const createRequests = observeProgramCreateRequests(page);

    try {
      const modal: NewProgramModal = await openNewProgramModal(page);
      await modal.fillProgramName('');

      await expect(modal.createButton).toBeDisabled();
      expect(createRequests.count()).toBe(0);
    } finally {
      createRequests.close();
    }
  });

  test('TC-004 - Description does not make an empty Program Name valid', async ({
    page,
  }) => {
    const createRequests = observeProgramCreateRequests(page);

    try {
      const modal: NewProgramModal = await openNewProgramModal(page);
      await modal.fillDescription('Full-stack web development program');

      await expect(modal.createButton).toBeDisabled();
      expect(createRequests.count()).toBe(0);
    } finally {
      createRequests.close();
    }
  });

  // Edge cases

  test('TC-005 - Treat three spaces as an empty Program Name', async ({
    page,
  }) => {
    const createRequests = observeProgramCreateRequests(page);

    try {
      const modal: NewProgramModal = await openNewProgramModal(page);
      await modal.fillProgramName('   ');

      await expect(modal.createButton).toBeDisabled();
      expect(createRequests.count()).toBe(0);
    } finally {
      createRequests.close();
    }
  });
});
