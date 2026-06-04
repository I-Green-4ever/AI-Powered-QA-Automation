import { test as base, expect } from '@playwright/test';
import {
  attachProgramCreateAutoTracker,
  clearCurrentTestPrograms,
  deleteProgramsForCurrentTest,
  isApiCleanupSkipped,
  readExecutionManifest,
  trackProgram,
  waitForProgramCreate,
} from '../lib/program-tracker';

/**
 * Per-test teardown: DELETE only program UUIDs tracked via trackProgram /
 * waitForProgramCreate during this test (scoped to the current Playwright
 * execution in test-results/.execution-manifest.json).
 */
export const test = base.extend({
  _apiCleanup: [
    async ({ page }, use) => {
      clearCurrentTestPrograms();
      attachProgramCreateAutoTracker(page);
      await use();
      if (isApiCleanupSkipped()) {
        console.log(
          '[program-cleanup] Per-test cleanup skipped (SKIP_API_CLEANUP).'
        );
        return;
      }
      const manifest = readExecutionManifest();
      if (!manifest) {
        console.warn(
          '[program-cleanup] No execution manifest; skipping per-test cleanup.'
        );
        return;
      }
      await deleteProgramsForCurrentTest();
    },
    { auto: true },
  ],
});

export { expect, trackProgram, waitForProgramCreate };
