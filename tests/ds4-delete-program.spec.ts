import { randomUUID } from 'node:crypto';
import type { Dialog, Page, Request } from '@playwright/test';
import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/programs.page';
import { createProgram } from './helpers/program';

function uniqueProgramName(baseValue: string): string {
  return `${baseValue} [${randomUUID()}]`;
}

function observeProgramDeleteRequests(page: Page): {
  count: () => number;
  close: () => void;
} {
  let deleteCount = 0;
  const onRequest = (request: Request): void => {
    if (
      request.method() === 'DELETE' &&
      /\/api\/programs\/[^/?]+(?:\?|$)/.test(request.url())
    ) {
      deleteCount++;
    }
  };

  page.on('request', onRequest);
  return {
    count: () => deleteCount,
    close: () => page.off('request', onRequest),
  };
}

async function captureAndDismissConfirmation(
  page: Page,
  activateDelete: () => Promise<void>,
  deleteRequestCount: () => number
): Promise<{
  type: string;
  message: string;
  deleteCountBeforeResponse: number;
}> {
  let resolveCapture: (capture: {
    type: string;
    message: string;
    deleteCountBeforeResponse: number;
  }) => void;
  let rejectCapture: (error: unknown) => void;
  const capturePromise = new Promise<{
    type: string;
    message: string;
    deleteCountBeforeResponse: number;
  }>((resolve, reject) => {
    resolveCapture = resolve;
    rejectCapture = reject;
  });

  const onDialog = async (dialog: Dialog): Promise<void> => {
    const capture = {
      type: dialog.type(),
      message: dialog.message(),
      deleteCountBeforeResponse: deleteRequestCount(),
    };

    try {
      await dialog.dismiss();
      resolveCapture(capture);
    } catch (error) {
      rejectCapture(error);
    }
  };

  page.on('dialog', onDialog);
  try {
    await activateDelete();
    return await capturePromise;
  } finally {
    page.off('dialog', onDialog);
  }
}

test.describe('DS-4 Delete program with confirmation', () => {
  // Positive flows

  test('TC-001 - Show confirmation before deleting Test Program', async ({
    page,
  }) => {
    const programName = uniqueProgramName('Test Program');
    await createProgram(page, programName, 'TC-001 delete confirmation');

    const programs = new ProgramsPage(page);
    const row = programs.programRow(programName);
    const deleteRequests = observeProgramDeleteRequests(page);

    try {
      const confirmation = await captureAndDismissConfirmation(
        page,
        () => row.clickDelete(),
        deleteRequests.count
      );

      expect(confirmation.type).toBe('confirm');
      expect(confirmation.deleteCountBeforeResponse).toBe(0);
      await expect(row.row).toBeVisible();
      expect(deleteRequests.count()).toBe(0);
    } finally {
      deleteRequests.close();
    }
  });

  test('TC-002 - Confirm deletion removes Test Program', async ({ page }) => {
    const programName = uniqueProgramName('Test Program');
    await createProgram(page, programName, 'TC-002 confirmed deletion');

    const programs = new ProgramsPage(page);
    const row = programs.programRow(programName);
    const deleteRequests = observeProgramDeleteRequests(page);

    try {
      await row.clickDeleteAccept();

      await expect(row.row).toHaveCount(0);
      expect(deleteRequests.count()).toBe(1);
    } finally {
      deleteRequests.close();
    }
  });

  test('TC-003 - Cancel deletion keeps Test Program', async ({ page }) => {
    const programName = uniqueProgramName('Test Program');
    await createProgram(page, programName, 'TC-003 cancelled deletion');

    const programs = new ProgramsPage(page);
    const row = programs.programRow(programName);
    const deleteRequests = observeProgramDeleteRequests(page);

    try {
      await row.clickDeleteDismiss();

      await expect(row.row).toBeVisible();
      expect(deleteRequests.count()).toBe(0);
    } finally {
      deleteRequests.close();
    }
  });

  // Negative

  test('TC-004 - Dismissing confirmation does not delete the program', async ({
    page,
  }) => {
    const programName = uniqueProgramName('Program To Keep');
    await createProgram(page, programName, 'TC-004 dismissed deletion');

    const programs = new ProgramsPage(page);
    const row = programs.programRow(programName);
    const deleteRequests = observeProgramDeleteRequests(page);

    try {
      await row.clickDeleteDismiss();

      await expect(row.row).toBeVisible();
      expect(deleteRequests.count()).toBe(0);
    } finally {
      deleteRequests.close();
    }
  });

  // Edge cases

  test('TC-005 - Confirmation identifies a program with special characters', async ({
    page,
  }) => {
    const programName = uniqueProgramName(
      `Renée's "Accelerated" Program`
    );
    await createProgram(page, programName, 'TC-005 special-character name');

    const programs = new ProgramsPage(page);
    const row = programs.programRow(programName);
    const deleteRequests = observeProgramDeleteRequests(page);

    try {
      const confirmation = await captureAndDismissConfirmation(
        page,
        () => row.clickDelete(),
        deleteRequests.count
      );

      expect(confirmation.type).toBe('confirm');
      expect(confirmation.message).toContain(programName);
      expect(confirmation.deleteCountBeforeResponse).toBe(0);
      await expect(row.row).toBeVisible();
      expect(deleteRequests.count()).toBe(0);

      await row.clickDeleteAccept();

      await expect(row.row).toHaveCount(0);
      expect(deleteRequests.count()).toBe(1);
    } finally {
      deleteRequests.close();
    }
  });
});
