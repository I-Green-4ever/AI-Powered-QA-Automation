import { randomUUID } from 'node:crypto';
import type { Page, Request } from '@playwright/test';
import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/programs.page';
import { clickCreateAndTrack, createProgram } from './helpers/program';
import { openNewProgramModal } from './helpers/programs-ui';

function uniqueProgramName(baseValue: string): string {
  return `${baseValue} [${randomUUID()}]`;
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

test.describe('DS-3 Program name validation and duplicate prevention', () => {
  // Happy paths

  test('TC-001 - Accept the required special-character program name', async ({
    page,
  }) => {
    const programName = uniqueProgramName(
      'Informatique & IA - Niveau 2'
    );
    const description =
      'Programme spécialisé en intelligence artificielle';
    const programs = new ProgramsPage(page);
    const modal = await openNewProgramModal(page);

    await modal.fillProgramName(programName);
    await modal.fillDescription(description);
    await clickCreateAndTrack(page, modal);

    await expect(modal.dialog).toBeHidden();
    await expect(programs.row(programName)).toHaveCount(1);
  });

  test('TC-002 - Accept accented characters, apostrophes, and quotation marks', async ({
    page,
  }) => {
    const programName = uniqueProgramName(
      `Renée's "Accelerated" IA Programme`
    );
    const programs = new ProgramsPage(page);
    const modal = await openNewProgramModal(page);

    await modal.fillProgramName(programName);
    await clickCreateAndTrack(page, modal);

    await expect(modal.dialog).toBeHidden();
    await expect(programs.row(programName)).toHaveCount(1);
  });

  // Negative

  test('TC-003 - Reject a program name containing only three spaces', async ({
    page,
  }) => {
    const modal = await openNewProgramModal(page);
    const createRequests = observeProgramCreateRequests(page);

    try {
      await modal.fillProgramName('   ');

      await expect(modal.createButton).toBeDisabled();
      await expect(modal.dialog).toBeVisible();
      expect(createRequests.count()).toBe(0);
    } finally {
      createRequests.close();
    }
  });

  test('TC-004 - Reject an empty program name', async ({ page }) => {
    const modal = await openNewProgramModal(page);
    const createRequests = observeProgramCreateRequests(page);

    try {
      await modal.fillProgramName('');

      await expect(modal.programNameInput).toHaveValue('');
      await expect(modal.createButton).toBeDisabled();
      expect(createRequests.count()).toBe(0);
    } finally {
      createRequests.close();
    }
  });

  test('TC-005 - Reject an exact duplicate program name', async ({ page }) => {
    const programName = uniqueProgramName('Web Development 2026');
    await createProgram(page, programName, 'Duplicate-test precondition');

    const programs = new ProgramsPage(page);
    const modal = await openNewProgramModal(page);
    await modal.fillProgramName(programName);

    test.fail(
      true,
      'DS-153: exact duplicate creation currently succeeds instead of remaining open with an error'
    );
    await modal.clickCreate();

    const duplicateError = modal.fieldAlert.or(modal.duplicateError);
    await expect(modal.dialog).toBeVisible();
    await expect(duplicateError).toBeVisible();
    await expect(duplicateError).toContainText(
      /already exists|duplicate|taken|in use/i
    );
    await expect(programs.row(programName)).toHaveCount(1);
  });

  test('TC-006 - Preserve entered values after duplicate rejection', async ({
    page,
  }) => {
    const programName = uniqueProgramName('Web Development 2026');
    const description = 'Full-stack web curriculum';
    await createProgram(page, programName, 'Duplicate-test precondition');

    const modal = await openNewProgramModal(page);
    await modal.fillProgramName(programName);
    await modal.fillDescription(description);

    test.fail(
      true,
      'DS-153: duplicate creation currently succeeds and closes the form instead of preserving its values'
    );
    await modal.clickCreate();

    await expect(modal.dialog).toBeVisible();
    await expect(modal.programNameInput).toHaveValue(programName);
    await expect(modal.descriptionInput).toHaveValue(description);
  });

  // Edge cases

  test('TC-007 - Treat mixed whitespace as an empty program name', async ({
    page,
  }) => {
    const modal = await openNewProgramModal(page);
    const createRequests = observeProgramCreateRequests(page);

    try {
      await modal.fillProgramName('\t \u00A0\n');

      await expect(modal.createButton).toBeDisabled();
      expect(createRequests.count()).toBe(0);
    } finally {
      createRequests.close();
    }
  });
});
