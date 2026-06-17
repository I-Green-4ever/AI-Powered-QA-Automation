import { test, expect } from '../fixtures/cleanup.fixture';
import { clickCreateAndTrack, createProgram } from './helpers/program';
import { openEditModal } from './helpers/programs-ui';
import { ProgramsPage } from '../pages/programs.page';
import { AppShell } from '../pages/app-shell.page';
import { LoginPage } from '../pages/login.page';
import type { Dialog, Route } from '@playwright/test';
import { format } from 'date-fns';

/**
 * Build a unique, human-readable suffix for test data so each run produces
 * fresh program names that don't collide with previous runs or seed data.
 * Shape: "dd/MMM/yyyy [hh:mm:ss]" e.g. "17/May/2026 [19:44:33]".
 */
function uniqueSuffix(): string {
  const now = new Date();
  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  const ss = now.getSeconds().toString().padStart(2, '0');

  const timeString = `${hh}:${mm}:${ss}`;

  return `${format(now, 'dd/MMM/yyyy')} [${timeString}]`;
}

// ============================================================================
// Authenticated suite — session from storageState (auth.setup.ts)
// ============================================================================

test.describe('DS-5 Program List & Display (Didaxis Studio)', () => {
  // ---------------------------------------------------------------------------
  // Positive flows
  // ---------------------------------------------------------------------------

  test('TC-001 - Programs page renders a list with name and description (AC1 verbatim)', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. Display AC1 ${uniqueSuffix()}`;
    const description = 'I.G. display ac1 description';
    await createProgram(page, programName, description);

    await programs.goto();
    await expect(programs.heading).toBeVisible();

    const row = programs.row(programName);
    await expect(row).toBeVisible();
    // Both name AND description must be present in the row.
    await expect(row).toContainText(programName);
    await expect(row).toContainText(description);
  });

  test('TC-002 - A program created in the same session appears in the list (cross-cuts DS-1)', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. Display Smoke ${uniqueSuffix()}`;
    const description = 'I.G. desc smoke';

    // createProgram already verifies the row appears post-modal-close,
    // which is the contract under test for TC-002.
    await createProgram(page, programName, description);

    const row = programs.row(programName);
    await expect(row).toBeVisible();
    await expect(row).toContainText(description);
  });

  test('TC-003 - Multiple programs render side-by-side without overlap', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const suffix = uniqueSuffix();
    const programList = [
      { name: `I.G. Multi A ${suffix}`, description: 'I.G. multi A desc' },
      { name: `I.G. Multi B ${suffix}`, description: 'I.G. multi B desc' },
      { name: `I.G. Multi C ${suffix}`, description: 'I.G. multi C desc' },
    ];

    for (const p of programList) {
      await createProgram(page, p.name, p.description);
    }

    await programs.goto();

    for (const p of programList) {
      const row = programs.row(p.name);
      await expect(row).toBeVisible();
      await expect(row).toContainText(p.name);
      await expect(row).toContainText(p.description);
    }

    // None of the descriptions should leak into a sibling row.
    const rowB = programs.row(programList[1].name);
    await expect(rowB).not.toContainText(programList[0].description);
    await expect(rowB).not.toContainText(programList[2].description);
  });

  test('TC-004 - Empty state shows a "no programs yet" message and a create prompt (AC2 verbatim)', async ({ page }) => {
    const programs = new ProgramsPage(page);

    // Force the list endpoint to return zero programs so we can drive the
    // empty-state UI without depending on tenant data.
    await page.route('**/api/programs', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] }),
        });
        return;
      }
      await route.continue();
    });

    await programs.goto();
    await expect(programs.heading).toBeVisible();

    // No data rows are rendered.
    await expect(programs.dataRows).toHaveCount(0);

    // (a) Some "no programs" message exists. Exact copy is product-specific
    // per plan ambiguity #4, so match loosely.
    await expect(programs.emptyStateHint).toBeVisible();

    // (b) Some create affordance is reachable from this state (+ New Program or Create Program).
    await expect(programs.newProgramButton).toBeVisible();
  });

  test('TC-005 - Deleting the last program triggers the empty state (cross-cuts DS-4)', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. Solo ${uniqueSuffix()}`;
    const programId = `mock-solo-${Date.now()}`;
    const description = 'I.G. solo precondition';

    // Make GET return exactly one fake program, then return { data: [] } after DELETE.
    let deleted = false;
    const handleProgramsApi = async (route: Route) => {
      const req = route.request();
      const url = new URL(req.url());
      if (req.method() === 'GET' && url.pathname === '/api/programs') {
        const data = deleted
          ? []
          : [{ id: programId, name: programName, description }];
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data }),
        });
        return;
      }
      if (
        req.method() === 'DELETE' &&
        url.pathname === `/api/programs/${programId}`
      ) {
        deleted = true;
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        return;
      }
      await route.continue();
    };
    await page.route('**/api/programs', handleProgramsApi);
    await page.route('**/api/programs/*', handleProgramsApi);

    await programs.goto();
    const row = programs.programRow(programName);
    await expect(row.row).toBeVisible();

    await row.clickDeleteAccept();

    // Transition: row gone, empty-state visible without manual refresh.
    await expect(programs.dataRows).toHaveCount(0);
    await expect(programs.emptyStateHint).toBeVisible();
  });

  test('TC-006 - Creating the first program from the empty state replaces the empty state with the list', async ({ page }) => {
    const programs = new ProgramsPage(page);

    // Start in mocked empty state.
    await page.route('**/api/programs', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] }),
        });
        return;
      }
      await route.continue();
    });

    await programs.goto();
    await expect(programs.dataRows).toHaveCount(0);
    await expect(programs.emptyStateHint).toBeVisible();

    // Empty-state CTA — stable role/name locator (header "+ New Program" also valid per AC2).
    const modal = await programs.openNewProgram();
    await expect(modal.dialog).toBeVisible();

    const programName = `I.G. First ${uniqueSuffix()}`;
    const description = 'I.G. desc';
    await modal.fillProgramName(programName);
    await modal.fillDescription(description);

    // Let the POST hit the real backend; mock the post-create GET so the
    // refreshed list shows exactly the row we just created.
    await page.unroute('**/api/programs');
    await page.route('**/api/programs', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [{ id: 'mock-first', name: programName, description }],
          }),
        });
        return;
      }
      await route.continue();
    });

    await clickCreateAndTrack(page, modal);
    await expect(modal.dialog).toBeHidden();

    // Empty state gone; the new (only) row is rendered.
    await expect(programs.emptyStateHint).toHaveCount(0);
    const row = programs.row(programName);
    await expect(row).toBeVisible();
    await expect(row).toContainText(description);
    await expect(programs.dataRows).toHaveCount(1);
  });

  // ---------------------------------------------------------------------------
  // Negative flows
  // ---------------------------------------------------------------------------

  test('TC-007 - Server failure (5xx) when loading the list shows an error state, not empty', async ({ page }) => {
    const programs = new ProgramsPage(page);

    await page.route('**/api/programs', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Simulated server failure' }),
        });
        return;
      }
      await route.continue();
    });

    await programs.goto();
    await expect(programs.heading).toBeVisible();

    // No data rows under a 5xx.
    await expect(programs.dataRows).toHaveCount(0);
    // Must NOT be misrepresented as "no programs yet".
    await expect(programs.emptyStateHint).toHaveCount(0);
    // Some error indication is visible (exact copy is product-specific per
    // plan ambiguity #7 — match loosely).
    await expect(programs.errorHint).toBeVisible();
  });

  test('TC-008 - Slow / pending request shows a clear loading state, not a flash of empty state', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. Loading ${uniqueSuffix()}`;
    // Seed one row so the post-load UI renders the table (empty tenant shows a card, not <table>).
    await createProgram(page, programName, 'I.G. loading precondition');

    // Hold the response open for ~2s so we can observe the loading state.
    await page.route('**/api/programs', async (route) => {
      if (route.request().method() === 'GET') {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.continue();
        return;
      }
      await route.continue();
    });

    const navigation = programs.goto();

    // While the request is pending, the empty-state must NOT be visible.
    await expect(programs.heading).toBeVisible();
    await expect(programs.emptyStateHint).toHaveCount(0);

    await navigation;

    // After the response arrives, the table is visible (rows >= 0).
    await expect(programs.table).toBeVisible();
  });

  // No non-admin credentials in .env. Re-enable once
  // DIDAXIS_VIEWER_EMAIL / DIDAXIS_VIEWER_PASSWORD are provisioned.
  test.skip('TC-009 - Non-admin user sees the appropriate restricted view', async () => {
    // With viewer creds: navigate to /programs. Expect read-only list (no
    // edit/delete / + New Program) OR 403 / redirect.
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  test('TC-011 - Long names and descriptions are truncated or wrapped without breaking layout', async ({ page }) => {
    const programs = new ProgramsPage(page);

    // (a) 255-char name (per DS-1 TC-011) + (b) 1000-char description (per DS-1 TC-015).
    const suffix = uniqueSuffix();
    const longName = `I.G. ${'P'.repeat(250)}`;
    expect(longName).toHaveLength(255);
    const longDescName = `I.G. LongDesc ${suffix}`;
    const longDescription = 'I.G. description '.repeat(60).slice(0, 1000);
    expect(longDescription).toHaveLength(1000);

    await createProgram(page, longName, 'I.G. long-name short-desc');
    await createProgram(page, longDescName, longDescription);

    await programs.goto();

    // Both rows fit in the layout — table is visible and not clipped to nothing.
    const longNameRow = programs.programRow(longName);
    const longDescRow = programs.programRow(longDescName);
    await expect(longNameRow.row).toBeVisible();
    await expect(longDescRow.row).toBeVisible();

    // Per-row edit/delete affordances remain operable (not hidden by long text).
    await expect(longNameRow.editButton).toBeVisible();
    await expect(longNameRow.deleteButton).toBeVisible();
    await expect(longDescRow.editButton).toBeVisible();
    await expect(longDescRow.deleteButton).toBeVisible();

    // No row's rendered box exceeds the table's clientWidth — sanity check
    // against horizontal overflow.
    const overflow = await programs.table.evaluate((table) => {
      return table.scrollWidth > table.clientWidth + 1;
    });
    expect(overflow).toBe(false);
  });

  test('TC-012 - Unicode and special characters render correctly in name and description', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. Renée's "Accelerated" Program ${uniqueSuffix()}`;
    const description = 'I.G. Café & React <2026>';

    await createProgram(page, programName, description);
    await programs.goto();

    const row = programs.row(programName);
    await expect(row).toBeVisible();
    await expect(row).toContainText(programName);
    await expect(row).toContainText(description);

    // No HTML-encoded "&amp;" or "&lt;" entities should appear in the row text.
    const rowText = await row.innerText();
    expect(rowText).not.toContain('&amp;');
    expect(rowText).not.toContain('&lt;');
  });

  test('TC-013 - HTML-like text in name or description is rendered as plain text in the list (no XSS)', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const suffix = uniqueSuffix();
    const programName = `I.G. <img src=x onerror=alert(1)> ${suffix}`;
    const description = `<script>alert(2)</script> I.G. xss list ${suffix}`;

    // Fail loudly if rendering the list fires a native alert/confirm/prompt.
    const nativeDialogs: Dialog[] = [];
    page.on('dialog', (d) => {
      nativeDialogs.push(d);
      void d.dismiss();
    });

    await createProgram(page, programName, description);
    await programs.goto();

    const row = programs.row(programName);
    await expect(row).toBeVisible();
    await expect(row).toContainText(programName);
    await expect(row).toContainText(description);

    // No <img> or <script> element was injected into the row by the value.
    const injected = await row.evaluate((el) => ({
      images: el.querySelectorAll('img').length,
      scripts: el.querySelectorAll('script').length,
    }));
    expect(injected.images).toBe(0);
    expect(injected.scripts).toBe(0);

    expect(nativeDialogs).toHaveLength(0);
  });

  test('TC-014 - Programs with empty description display gracefully', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. NoDesc ${uniqueSuffix()}`;
    // DS-1 TC-005 confirmed Create is enabled with a name only — leverage that.
    await createProgram(page, programName /* no description */);

    await programs.goto();
    const row = programs.programRow(programName);
    await expect(row.row).toBeVisible();
    await expect(row.row).toContainText(programName);

    // Row remains operable: edit / delete still work.
    await expect(row.editButton).toBeVisible();
    await expect(row.deleteButton).toBeVisible();
  });

  test('TC-015 - An edit reflects in the list immediately (cross-cuts DS-2 AC2)', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const suffix = uniqueSuffix();
    const originalName = `I.G. To Rename ${suffix}`;
    const newName = `I.G. To Rename ${suffix} - Updated`;
    await createProgram(page, originalName, 'I.G. list edit precondition');

    const edit = await openEditModal(page, originalName);
    await edit.fillProgramName(newName);
    await edit.clickSave();
    await expect(edit.dialog).toBeHidden();

    // Restated from the list's perspective: new row visible, old name gone.
    await expect(programs.row(newName)).toBeVisible();
    await expect(programs.exactText(originalName)).toHaveCount(0);
  });

  test('TC-016 - A delete removes the row from the list immediately (cross-cuts DS-4 AC1)', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const programName = `I.G. To Delete ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. list delete precondition');

    await programs.goto();
    await programs.programRow(programName).clickDeleteAccept();

    // Row disappears without a manual refresh — no ghost row.
    await expect(programs.row(programName)).toHaveCount(0);
  });

  // 50+ rows requires either a massive UI-driven seed or direct DB seeding;
  // neither is practical against the shared test tenant in CI.
  test.skip('TC-017 - Many programs (50+) render without performance regressions', async () => {
    // Seed 50+ rows via API or fixtures, navigate, scroll, assert no missed
    // indexes or excessive lag.
  });

  test('TC-018 - List ordering is consistent across reloads', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const suffix = uniqueSuffix();
    const names = [
      `I.G. Order A ${suffix}`,
      `I.G. Order B ${suffix}`,
      `I.G. Order C ${suffix}`,
    ];
    for (const n of names) {
      await createProgram(page, n, 'I.G. order check');
    }

    const captureOrder = async () => {
      await programs.goto();
      for (const n of names) {
        await expect(programs.row(n)).toBeVisible();
      }
      const all = await programs.dataRows.allInnerTexts();
      return all
        .map((t) => names.find((n) => t.includes(n)))
        .filter((n): n is string => Boolean(n));
    };

    const order1 = await captureOrder();
    expect(order1).toHaveLength(names.length);

    // Hard-reload (fresh navigation, no cache assumptions).
    await page.reload();
    const order2 = await captureOrder();

    expect(order2).toEqual(order1);
  });

  // Cross-session reads require two concurrent admin contexts. Out of scope
  // for a single-page test.
  test.skip('TC-019 - List reflects rows created in a different session after re-fetch', async () => {
    // In context B, create a program. In context A, navigate away and back
    // and assert the row appears.
  });

  test('TC-020 - List does not include a deleted program', async ({ page }) => {
    const programs = new ProgramsPage(page);
    const shell = new AppShell(page);
    const programName = `I.G. Deleted ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. soft-delete check');

    await programs.goto();
    await programs.programRow(programName).clickDeleteAccept();
    await expect(programs.row(programName)).toHaveCount(0);

    // Round-trip away and back to force a re-fetch — the deleted name must
    // not reappear (display is over active programs only).
    await shell.goToDashboard();
    await shell.goToPrograms();

    await expect(programs.row(programName)).toHaveCount(0);
    await expect(programs.exactText(programName)).toHaveCount(0);
  });
});

// ============================================================================
// Unauthenticated suite — no login in beforeEach
// ============================================================================

test.describe('DS-5 Program List & Display — unauthenticated', () => {
  test('TC-010 - Unauthenticated access to /programs redirects to login', async ({ page, context }) => {
    const programs = new ProgramsPage(page);
    const login = new LoginPage(page);

    // Override storageState from the chromium project for this test only.
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await programs.goto();

    // Either the URL was rewritten to /login, or the Sign In form is shown
    // in-place (the empty state must NOT be shown to an anonymous user).
    await expect(login.signInButton).toBeVisible();
    await expect(programs.emptyStateHint).toHaveCount(0);
  });
});
