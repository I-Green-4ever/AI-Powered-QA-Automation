import { randomUUID } from 'node:crypto';
import type { Page, Request, Response } from '@playwright/test';
import { test, expect, trackProgram } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/programs.page';
import type { NewProgramModal } from '../pages/components/new-program.modal';
import { clickCreateAndTrack, createProgram } from './helpers/program';
import { openNewProgramModal } from './helpers/programs-ui';

function uniqueProgramName(baseValue: string): string {
  return `${baseValue} [${randomUUID()}]`;
}

function isProgramCreateRequest(request: Request): boolean {
  return (
    request.method() === 'POST' &&
    /\/api\/programs\/?$/.test(new URL(request.url()).pathname)
  );
}

function observeProgramCreateRequests(page: Page): {
  count: () => number;
  close: () => void;
} {
  let postCount = 0;
  const onRequest = (request: Request): void => {
    if (isProgramCreateRequest(request)) {
      postCount++;
    }
  };

  page.on('request', onRequest);
  return {
    count: () => postCount,
    close: () => page.off('request', onRequest),
  };
}

/**
 * Submit an attempt that should be rejected. If DS-153 causes a successful
 * create instead, explicitly track that unexpected record for API cleanup.
 */
async function submitDuplicateAttempt(
  page: Page,
  modal: NewProgramModal
): Promise<void> {
  let createResponse: Response | undefined;
  const duplicateError = modal.fieldAlert.or(modal.duplicateError);
  const onResponse = (response: Response): void => {
    if (isProgramCreateRequest(response.request())) {
      createResponse = response;
    }
  };

  page.on('response', onResponse);
  try {
    await modal.clickCreate();
    await expect
      .poll(
        async () =>
          createResponse !== undefined || (await duplicateError.isVisible()),
        {
          message:
            'duplicate attempt should settle with a response or visible error',
          timeout: 30_000,
        }
      )
      .toBe(true);

    if (!createResponse || !createResponse.ok()) {
      return;
    }

    const body = (await createResponse.json()) as {
      data?: { id?: string };
      id?: string;
    };
    const programId = body.data?.id ?? body.id;
    if (!programId) {
      throw new Error(
        'Successful duplicate create response did not include a program id'
      );
    }
    trackProgram(programId);
  } finally {
    page.off('response', onResponse);
  }
}

test.describe('DS-3 Program name validation and duplicate prevention', () => {
  // Positive flows

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
      'DS-153: exact duplicate creation currently succeeds instead of showing an error'
    );
    await submitDuplicateAttempt(page, modal);

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

    const programs = new ProgramsPage(page);
    const modal = await openNewProgramModal(page);
    await modal.fillProgramName(programName);
    await modal.fillDescription(description);

    test.fail(
      true,
      'DS-153: duplicate creation currently closes the form instead of preserving its values'
    );
    await submitDuplicateAttempt(page, modal);

    await expect.soft(modal.dialog).toBeVisible();
    await expect.soft(modal.programNameInput).toHaveValue(programName);
    await expect.soft(modal.descriptionInput).toHaveValue(description);
    await expect.soft(programs.row(programName)).toHaveCount(1);
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
