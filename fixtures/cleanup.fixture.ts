import { test as base, expect } from '@playwright/test';
import {
  clearCurrentTestPrograms,
  deleteProgramsForCurrentTest,
  isApiCleanupSkipped,
  trackProgram,
  waitForProgramCreate,
} from '../lib/program-tracker';

export const test = base.extend({
  _apiCleanup: [
    async ({}, use) => {
      clearCurrentTestPrograms();
      await use();
      if (isApiCleanupSkipped()) {
        console.log('[program-cleanup] Per-test cleanup skipped (SKIP_API_CLEANUP).');
      }
      await deleteProgramsForCurrentTest();
    },
    { auto: true },
  ],
});

export { expect, trackProgram, waitForProgramCreate };
