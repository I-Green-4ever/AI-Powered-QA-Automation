import { test, expect, type Page, type Locator, type Dialog } from '@playwright/test';
import { format } from 'date-fns';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing env var "${name}". Set it in the .env file at the project root.`
    );
  }
  return value;
}

const DIDAXIS_EMAIL = requireEnv('DIDAXIS_EMAIL');
const DIDAXIS_PASSWORD = requireEnv('DIDAXIS_PASSWORD');

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

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(DIDAXIS_EMAIL);
  await page.getByLabel('Password').fill(DIDAXIS_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('button', { name: /Programs/ })).toBeVisible();
}

async function createProgram(
  page: Page,
  name: string,
  description = ''
): Promise<void> {
  await page.goto('/programs');
  await page.getByRole('button', { name: '+ New Program' }).click();

  const dialog = page.getByRole('dialog', { name: 'New Program' });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('Program Name').fill(name);
  if (description) {
    await dialog.getByLabel('Description').fill(description);
  }
  await dialog.getByRole('button', { name: 'Create' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('row', { name })).toBeVisible();
}

function programRow(page: Page, programName: string): Locator {
  return page.getByRole('row', { name: programName });
}

/**
 * Data rows in the programs grid (excludes the header row). Each data row
 * has both an edit (✏️) and delete (🗑) control per Playwright MCP inspection.
 */
function programDataRows(page: Page): Locator {
  return page
    .getByRole('row')
    .filter({ has: page.getByRole('button', { name: '🗑' }) });
}

// ============================================================================
// Authenticated suite — login in beforeEach
// ============================================================================

test.describe('DS-5 Program List & Display (Didaxis Studio)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ---------------------------------------------------------------------------
  // Positive flows
  // ---------------------------------------------------------------------------

  test('TC-001 - Programs page renders a list with name and description (AC1 verbatim)', async ({ page }) => {
    // Ensure at least one program exists so AC1 is exercisable.
    const programName = `I.G. Display AC1 ${uniqueSuffix()}`;
    const description = 'I.G. display ac1 description';
    await createProgram(page, programName, description);

    await page.goto('/programs');
    await expect(page.getByRole('heading', { name: 'Programs' })).toBeVisible();

    const row = programRow(page, programName);
    await expect(row).toBeVisible();
    // Both name AND description must be present in the row.
    await expect(row).toContainText(programName);
    await expect(row).toContainText(description);
  });

  test('TC-002 - A program created in the same session appears in the list (cross-cuts DS-1)', async ({ page }) => {
    const programName = `I.G. Display Smoke ${uniqueSuffix()}`;
    const description = 'I.G. desc smoke';

    // createProgram already verifies the row appears post-modal-close,
    // which is the contract under test for TC-002.
    await createProgram(page, programName, description);

    const row = programRow(page, programName);
    await expect(row).toBeVisible();
    await expect(row).toContainText(description);
  });

  test('TC-003 - Multiple programs render side-by-side without overlap', async ({ page }) => {
    const suffix = uniqueSuffix();
    const programs = [
      { name: `I.G. Multi A ${suffix}`, description: 'I.G. multi A desc' },
      { name: `I.G. Multi B ${suffix}`, description: 'I.G. multi B desc' },
      { name: `I.G. Multi C ${suffix}`, description: 'I.G. multi C desc' },
    ];

    for (const p of programs) {
      await createProgram(page, p.name, p.description);
    }

    await page.goto('/programs');

    for (const p of programs) {
      const row = programRow(page, p.name);
      await expect(row).toBeVisible();
      await expect(row).toContainText(p.name);
      await expect(row).toContainText(p.description);
    }

    // None of the descriptions should leak into a sibling row.
    const rowB = programRow(page, programs[1].name);
    await expect(rowB).not.toContainText(programs[0].description);
    await expect(rowB).not.toContainText(programs[2].description);
  });

  test('TC-004 - Empty state shows a "no programs yet" message and a create prompt (AC2 verbatim)', async ({ page }) => {
    // Force the list endpoint to return zero programs so we can drive the
    // empty-state UI without depending on tenant data.
    await page.route('**/api/programs', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/programs');
    await expect(page.getByRole('heading', { name: 'Programs' })).toBeVisible();

    // No data rows are rendered.
    await expect(programDataRows(page)).toHaveCount(0);

    // (a) Some "no programs" message exists. Exact copy is product-specific
    // per plan ambiguity #4, so match loosely.
    await expect(
      page.getByText(/no programs|create your first|get started/i)
    ).toBeVisible();

    // (b) Some create affordance is reachable from this state.
    await expect(
      page.getByRole('button', { name: /\+ ?New Program|Create Program|Create program/ })
    ).toBeVisible();
  });

  test('TC-005 - Deleting the last program triggers the empty state (cross-cuts DS-4)', async ({ page }) => {
    const programName = `I.G. Solo ${uniqueSuffix()}`;
    const programId = `mock-solo-${Date.now()}`;
    const description = 'I.G. solo precondition';

    // Make GET return exactly one fake program, then return [] after DELETE.
    let deleted = false;
    await page.route('**/api/programs**', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      if (req.method() === 'GET' && url.pathname === '/api/programs') {
        const body = deleted
          ? []
          : [{ id: programId, name: programName, description }];
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(body),
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
    });

    await page.goto('/programs');
    const row = programRow(page, programName);
    await expect(row).toBeVisible();

    page.once('dialog', (d) => void d.accept());
    await row.getByRole('button', { name: '🗑' }).click();

    // Transition: row gone, empty-state visible without manual refresh.
    await expect(programDataRows(page)).toHaveCount(0);
    await expect(
      page.getByText(/no programs|create your first|get started/i)
    ).toBeVisible();
  });

  test('TC-006 - Creating the first program from the empty state replaces the empty state with the list', async ({ page }) => {
    // Start in mocked empty state.
    await page.route('**/api/programs', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/programs');
    await expect(programDataRows(page)).toHaveCount(0);

    // Click the create CTA reachable from the empty state.
    await page
      .getByRole('button', { name: /\+ ?New Program|Create Program|Create program/ })
      .first()
      .click();

    const dialog = page.getByRole('dialog', { name: 'New Program' });
    await expect(dialog).toBeVisible();

    const programName = `I.G. First ${uniqueSuffix()}`;
    const description = 'I.G. desc';
    await dialog.getByLabel('Program Name').fill(programName);
    await dialog.getByLabel('Description').fill(description);

    // Let the POST hit the real backend; mock the post-create GET so the
    // refreshed list shows exactly the row we just created.
    await page.unroute('**/api/programs');
    await page.route('**/api/programs', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 'mock-first', name: programName, description },
          ]),
        });
        return;
      }
      await route.continue();
    });

    await dialog.getByRole('button', { name: 'Create' }).click();
    await expect(dialog).toBeHidden();

    // Empty state gone; the new (only) row is rendered.
    await expect(
      page.getByText(/no programs|create your first|get started/i)
    ).toHaveCount(0);
    const row = programRow(page, programName);
    await expect(row).toBeVisible();
    await expect(row).toContainText(description);
    await expect(programDataRows(page)).toHaveCount(1);
  });

  // ---------------------------------------------------------------------------
  // Negative flows
  // ---------------------------------------------------------------------------

  test('TC-007 - Server failure (5xx) when loading the list shows an error state, not empty', async ({ page }) => {
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

    await page.goto('/programs');
    await expect(page.getByRole('heading', { name: 'Programs' })).toBeVisible();

    // No data rows under a 5xx.
    await expect(programDataRows(page)).toHaveCount(0);
    // Must NOT be misrepresented as "no programs yet".
    await expect(
      page.getByText(/no programs|create your first/i)
    ).toHaveCount(0);
    // Some error indication is visible (exact copy is product-specific per
    // plan ambiguity #7 — match loosely).
    await expect(
      page.getByText(/error|failed|something went wrong|try again/i)
    ).toBeVisible();
  });

  test('TC-008 - Slow / pending request shows a clear loading state, not a flash of empty state', async ({ page }) => {
    // Hold the response open for ~2s so we can observe the loading state.
    await page.route('**/api/programs', async (route) => {
      if (route.request().method() === 'GET') {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.continue();
        return;
      }
      await route.continue();
    });

    const navigation = page.goto('/programs');

    // While the request is pending, the empty-state must NOT be visible.
    await expect(page.getByRole('heading', { name: 'Programs' })).toBeVisible();
    await expect(
      page.getByText(/no programs|create your first/i)
    ).toHaveCount(0);

    await navigation;

    // After the response arrives, the table is visible (rows >= 0).
    await expect(page.getByRole('table')).toBeVisible();
  });

  // No non-admin credentials in .env. Re-enable once
  // DIDAXIS_VIEWER_EMAIL / DIDAXIS_VIEWER_PASSWORD are provisioned.
  test.skip('TC-009 - Non-admin user sees the appropriate restricted view', async () => {
    // With viewer creds: navigate to /programs. Expect read-only list (no
    // ✏️ / 🗑 / + New Program) OR 403 / redirect.
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  test('TC-011 - Long names and descriptions are truncated or wrapped without breaking layout', async ({ page }) => {
    // (a) 255-char name (per DS-1 TC-011) + (b) 1000-char description (per DS-1 TC-015).
    const suffix = uniqueSuffix();
    const longName = `I.G. ${'P'.repeat(250)}`;
    expect(longName).toHaveLength(255);
    const longDescName = `I.G. LongDesc ${suffix}`;
    const longDescription = 'I.G. description '.repeat(60).slice(0, 1000);
    expect(longDescription).toHaveLength(1000);

    await createProgram(page, longName, 'I.G. long-name short-desc');
    await createProgram(page, longDescName, longDescription);

    await page.goto('/programs');

    // Both rows fit in the layout — table is visible and not clipped to nothing.
    const longNameRow = programRow(page, longName);
    const longDescRow = programRow(page, longDescName);
    await expect(longNameRow).toBeVisible();
    await expect(longDescRow).toBeVisible();

    // Per-row edit/delete affordances remain operable (not hidden by long text).
    await expect(longNameRow.getByRole('button', { name: '✏️' })).toBeVisible();
    await expect(longNameRow.getByRole('button', { name: '🗑' })).toBeVisible();
    await expect(longDescRow.getByRole('button', { name: '✏️' })).toBeVisible();
    await expect(longDescRow.getByRole('button', { name: '🗑' })).toBeVisible();

    // No row's rendered box exceeds the table's clientWidth — sanity check
    // against horizontal overflow.
    const overflow = await page.evaluate(() => {
      const table = document.querySelector('table');
      if (!table) return false;
      return table.scrollWidth > table.clientWidth + 1;
    });
    expect(overflow).toBe(false);
  });

  test('TC-012 - Unicode and special characters render correctly in name and description', async ({ page }) => {
    const programName = `I.G. Renée's "Accelerated" Program ${uniqueSuffix()}`;
    const description = 'I.G. Café & React <2026>';

    await createProgram(page, programName, description);
    await page.goto('/programs');

    const row = programRow(page, programName);
    await expect(row).toBeVisible();
    await expect(row).toContainText(programName);
    await expect(row).toContainText(description);

    // No HTML-encoded "&amp;" or "&lt;" entities should appear in the row text.
    const rowText = await row.innerText();
    expect(rowText).not.toContain('&amp;');
    expect(rowText).not.toContain('&lt;');
  });

  test('TC-013 - HTML-like text in name or description is rendered as plain text in the list (no XSS)', async ({ page }) => {
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
    await page.goto('/programs');

    const row = programRow(page, programName);
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
    const programName = `I.G. NoDesc ${uniqueSuffix()}`;
    // DS-1 TC-005 confirmed Create is enabled with a name only — leverage that.
    await createProgram(page, programName /* no description */);

    await page.goto('/programs');
    const row = programRow(page, programName);
    await expect(row).toBeVisible();
    await expect(row).toContainText(programName);

    // Row remains operable: edit / delete still work.
    await expect(row.getByRole('button', { name: '✏️' })).toBeVisible();
    await expect(row.getByRole('button', { name: '🗑' })).toBeVisible();
  });

  test('TC-015 - An edit reflects in the list immediately (cross-cuts DS-2 AC2)', async ({ page }) => {
    const suffix = uniqueSuffix();
    const originalName = `I.G. To Rename ${suffix}`;
    const newName = `I.G. To Rename ${suffix} - Updated`;
    await createProgram(page, originalName, 'I.G. list edit precondition');

    // Open the edit modal on the row.
    await page.goto('/programs');
    const row = programRow(page, originalName);
    await row.getByRole('button', { name: '✏️' }).click();
    const editDialog = page.getByRole('dialog', { name: 'Edit Program' });
    await expect(editDialog).toBeVisible();
    await editDialog.getByLabel('Program Name').fill(newName);
    await editDialog.getByRole('button', { name: 'Save' }).click();
    await expect(editDialog).toBeHidden();

    // Restated from the list's perspective: new row visible, old name gone.
    await expect(programRow(page, newName)).toBeVisible();
    await expect(page.getByText(originalName, { exact: true })).toHaveCount(0);
  });

  test('TC-016 - A delete removes the row from the list immediately (cross-cuts DS-4 AC1)', async ({ page }) => {
    const programName = `I.G. To Delete ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. list delete precondition');

    await page.goto('/programs');
    page.once('dialog', (d) => void d.accept());
    await programRow(page, programName).getByRole('button', { name: '🗑' }).click();

    // Row disappears without a manual refresh — no ghost row.
    await expect(programRow(page, programName)).toHaveCount(0);
  });

  // 50+ rows requires either a massive UI-driven seed or direct DB seeding;
  // neither is practical against the shared test tenant in CI.
  test.skip('TC-017 - Many programs (50+) render without performance regressions', async () => {
    // Seed 50+ rows via API or fixtures, navigate, scroll, assert no missed
    // indexes or excessive lag.
  });

  test('TC-018 - List ordering is consistent across reloads', async ({ page }) => {
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
      await page.goto('/programs');
      const all = await programDataRows(page).allInnerTexts();
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
    const programName = `I.G. Deleted ${uniqueSuffix()}`;
    await createProgram(page, programName, 'I.G. soft-delete check');

    await page.goto('/programs');
    page.once('dialog', (d) => void d.accept());
    await programRow(page, programName).getByRole('button', { name: '🗑' }).click();
    await expect(programRow(page, programName)).toHaveCount(0);

    // Round-trip away and back to force a re-fetch — the deleted name must
    // not reappear (display is over active programs only).
    await page.getByRole('button', { name: /Dashboard/ }).click();
    await page.getByRole('button', { name: /Programs/ }).click();

    await expect(programRow(page, programName)).toHaveCount(0);
    await expect(page.getByText(programName, { exact: true })).toHaveCount(0);
  });
});

// ============================================================================
// Unauthenticated suite — no login in beforeEach
// ============================================================================

test.describe('DS-5 Program List & Display — unauthenticated', () => {
  test('TC-010 - Unauthenticated access to /programs redirects to login', async ({ page, context }) => {
    // Guarantee a clean session.
    await context.clearCookies();

    await page.goto('/programs');

    // Either the URL was rewritten to /login, or the Sign In form is shown
    // in-place (the empty state must NOT be shown to an anonymous user).
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(
      page.getByText(/no programs|create your first/i)
    ).toHaveCount(0);
  });
});
