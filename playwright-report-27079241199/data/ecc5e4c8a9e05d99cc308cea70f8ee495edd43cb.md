# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ds1-create-program.spec.ts >> DS-1 Create Program (Didaxis Studio) >> TC-005 - Description is optional — program creates with name only
- Location: tests/ds1-create-program.spec.ts:97:7

# Error details

```
Error: expect(locator).not.toBeVisible() failed

Locator:  getByRole('row').filter({ has: getByRole('button', { name: 'Edit I.G. Name Only 07/Jun/2026 [01:31:52]' }) })
Expected: not visible
Received: visible
Timeout:  5000ms

Call log:
  - Expect "not toBeVisible" with timeout 5000ms
  - waiting for getByRole('row').filter({ has: getByRole('button', { name: 'Edit I.G. Name Only 07/Jun/2026 [01:31:52]' }) })
    14 × locator resolved to <tr data-hover="true" data-with-row-border="true" class="m_4e7aa4fd mantine-Table-tr">…</tr>
       - unexpected value "visible"

```

```yaml
- row "I.G. Name Only 07/Jun/2026 [01:31:52] Edit I.G. Name Only 07/Jun/2026 [01:31:52] Delete I.G. Name Only 07/Jun/2026 [01:31:52]":
  - cell "I.G. Name Only 07/Jun/2026 [01:31:52]"
  - cell "Edit I.G. Name Only 07/Jun/2026 [01:31:52] Delete I.G. Name Only 07/Jun/2026 [01:31:52]"
```

# Test source

```ts
  11  |  * Build a unique, human-readable suffix for test data so each run produces
  12  |  * fresh program names that don't collide with previous runs or seed data.
  13  |  * Shape: "dd/MMM/yyyy [hh:mm:ss]" e.g. "17/May/2026 [18:46:21]".
  14  |  */
  15  | function uniqueSuffix(): string {
  16  |   const now = new Date();
  17  |   const hh = now.getHours().toString().padStart(2, '0');
  18  |   const mm = now.getMinutes().toString().padStart(2, '0');
  19  |   const ss = now.getSeconds().toString().padStart(2, '0');
  20  | 
  21  |   const timeString = `${hh}:${mm}:${ss}`;
  22  | 
  23  |   return `${format(now, 'dd/MMM/yyyy')} [${timeString}]`;
  24  | }
  25  | 
  26  | test.describe('DS-1 Create Program (Didaxis Studio)', () => {
  27  |   // ---------------------------------------------------------------------------
  28  |   // Positive flows
  29  |   // ---------------------------------------------------------------------------
  30  | 
  31  |   test('TC-001 - Clicking + New Program opens the creation form with required fields', async ({ page }) => {
  32  |     const modal = await openNewProgramModal(page);
  33  | 
  34  |     await expect(modal.programNameInput).toBeVisible();
  35  |     await expect(modal.programNameInput).toHaveAttribute('placeholder', 'e.g. Computer Science BSc');
  36  | 
  37  |     await expect(modal.descriptionInput).toBeVisible();
  38  |     await expect(modal.descriptionInput).toHaveAttribute('placeholder', 'Brief description');
  39  | 
  40  |     await expect(modal.createButton).toBeVisible();
  41  |     // With empty name, Create must start disabled (AC3 reinforcement).
  42  |     await expect(modal.createButton).toBeDisabled();
  43  |   });
  44  | 
  45  |   test('TC-002 - Creating with valid Program Name and Description succeeds', async ({ page }) => {
  46  |     const programName = `I.G. Web Development 2026 ${uniqueSuffix()}`;
  47  |     const programDescription = 'Full-stack web development program';
  48  | 
  49  |     const programs = new ProgramsPage(page);
  50  |     const modal = await openNewProgramModal(page);
  51  |     await modal.fillProgramName(programName);
  52  |     await modal.fillDescription(programDescription);
  53  |     await clickCreateAndTrack(page, modal);
  54  | 
  55  |     await expect(modal.dialog).toBeHidden();
  56  | 
  57  |     // New row appears in the programs list without a manual refresh.
  58  |     const newRow = programs.row(programName);
  59  |     await expect(newRow).toBeVisible();
  60  |     await expect(newRow).toContainText(programDescription);
  61  |   });
  62  | 
  63  |   test('TC-003 - Modal closes immediately after a successful Create', async ({ page }) => {
  64  |     const programName = `I.G. Smoke Create ${uniqueSuffix()}`;
  65  | 
  66  |     const programs = new ProgramsPage(page);
  67  |     const modal = await openNewProgramModal(page);
  68  |     await modal.fillProgramName(programName);
  69  |     await modal.fillDescription('I.G. smoke create');
  70  |     await clickCreateAndTrack(page, modal);
  71  | 
  72  |     // Within ~2s, the dialog should be gone, and no second click is required.
  73  |     await expect(modal.dialog).toBeHidden({ timeout: 2000 });
  74  |     await expect(programs.row(programName)).toBeVisible();
  75  |   });
  76  | 
  77  |   test('TC-004 - Newly created program is persisted (visible after navigation)', async ({ page }) => {
  78  |     const programName = `I.G. Persisted ${uniqueSuffix()}`;
  79  | 
  80  |     const programs = new ProgramsPage(page);
  81  |     const shell = new AppShell(page);
  82  |     const modal = await openNewProgramModal(page);
  83  |     await modal.fillProgramName(programName);
  84  |     await modal.fillDescription('I.G. persisted across navigation');
  85  |     await clickCreateAndTrack(page, modal);
  86  | 
  87  |     await expect(modal.dialog).toBeHidden();
  88  |     await expect(programs.row(programName)).toBeVisible();
  89  | 
  90  |     // Navigate away and back — the row must come from the server, not local state.
  91  |     await shell.goToDashboard();
  92  |     await shell.goToPrograms();
  93  | 
  94  |     await expect(programs.row(programName)).toBeVisible();
  95  |   });
  96  | 
  97  |   test('TC-005 - Description is optional — program creates with name only', async ({ page }) => {
  98  |     const programName = `I.G. Name Only ${uniqueSuffix()}`;
  99  | 
  100 |     const programs = new ProgramsPage(page);
  101 |     const modal = await openNewProgramModal(page);
  102 |     await modal.fillProgramName(programName);
  103 |     // Leave Description empty on purpose.
  104 | 
  105 |     // Per current product behavior, Create is enabled with a non-empty name only.
  106 |     await expect(modal.createButton).toBeEnabled();
  107 |     await clickCreateAndTrack(page, modal);
  108 | 
  109 |     await expect(modal.dialog).toBeHidden();
  110 |     //my edit....
> 111 |     await expect(programs.row(programName)).not.toBeVisible();
      |                                                 ^ Error: expect(locator).not.toBeVisible() failed
  112 |   });
  113 | 
  114 |   // ---------------------------------------------------------------------------
  115 |   // Negative flows
  116 |   // ---------------------------------------------------------------------------
  117 | 
  118 |   test('TC-006 - Empty Program Name keeps Create disabled (AC3)', async ({ page }) => {
  119 |     const modal = await openNewProgramModal(page);
  120 | 
  121 |     await expect(modal.createButton).toBeDisabled();
  122 | 
  123 |     // Pressing Enter inside Program Name while empty must not create a program.
  124 |     await modal.focusProgramName();
  125 |     await page.keyboard.press('Enter');
  126 | 
  127 |     await expect(modal.dialog).toBeVisible();
  128 |     await expect(modal.createButton).toBeDisabled();
  129 |   });
  130 | 
  131 |   test('TC-007 - Whitespace-only Program Name is treated as empty', async ({ page }) => {
  132 |     const programs = new ProgramsPage(page);
  133 |     const modal = await openNewProgramModal(page);
  134 | 
  135 |     await modal.fillProgramName('   ');
  136 | 
  137 |     await expect(modal.createButton).toBeDisabled();
  138 |     // A program literally named "   " must never appear in the list.
  139 |     await expect(programs.programRow('   ').editButton).toHaveCount(0);
  140 |   });
  141 | 
  142 |   test('TC-008 - Cancelling the modal discards entered values and creates nothing', async ({ page }) => {
  143 |     const draftName = `I.G. Cancelled ${uniqueSuffix()}`;
  144 | 
  145 |     const programs = new ProgramsPage(page);
  146 |     const modal = await openNewProgramModal(page);
  147 |     await modal.fillProgramName(draftName);
  148 |     await modal.fillDescription('I.G. should not be saved');
  149 |     await modal.clickCancel();
  150 | 
  151 |     await expect(modal.dialog).toBeHidden();
  152 |     await expect(programs.row(draftName)).toHaveCount(0);
  153 | 
  154 |     // Re-opening the modal must show empty fields (no draft retention).
  155 |     const reopened = await openNewProgramModal(page);
  156 |     await expect(reopened.programNameInput).toHaveValue('');
  157 |     await expect(reopened.descriptionInput).toHaveValue('');
  158 |   });
  159 | 
  160 |   test('TC-009 - Server failure (5xx) on Create surfaces an error and does not add a row', async ({ page }) => {
  161 |     const programName = `I.G. Server Failure ${uniqueSuffix()}`;
  162 | 
  163 |     // Force the create endpoint to fail with a 500 so we can assert the UX.
  164 |     await page.route('**/api/programs', async (route) => {
  165 |       if (route.request().method() === 'POST') {
  166 |         await route.fulfill({
  167 |           status: 500,
  168 |           contentType: 'application/json',
  169 |           body: JSON.stringify({ error: 'Simulated server failure' }),
  170 |         });
  171 |         return;
  172 |       }
  173 |       await route.continue();
  174 |     });
  175 | 
  176 |     const programs = new ProgramsPage(page);
  177 |     const modal = await openNewProgramModal(page);
  178 |     await modal.fillProgramName(programName);
  179 |     await modal.fillDescription('I.G. 500 simulation');
  180 |     await modal.clickCreate();
  181 | 
  182 |     // Modal should stay open (data preserved) and no new row should appear.
  183 |     await expect(modal.dialog).toBeVisible();
  184 |     await expect(modal.programNameInput).toHaveValue(programName);
  185 |     await expect(programs.row(programName)).toHaveCount(0);
  186 |   });
  187 | 
  188 |   // Ambiguity #5 from the test plan: no non-admin credentials are provisioned
  189 |   // for this suite, so TC-010 is intentionally skipped until they exist.
  190 |   test.skip('TC-010 - Non-admin user cannot create programs (if role-gated)', async () => {
  191 |     // Requires a non-admin account (e.g. qa-viewer@school.edu). Provide
  192 |     // DIDAXIS_VIEWER_EMAIL / DIDAXIS_VIEWER_PASSWORD env vars and remove
  193 |     // the skip to enable.
  194 |   });
  195 | 
  196 |   // ---------------------------------------------------------------------------
  197 |   // Edge cases
  198 |   // ---------------------------------------------------------------------------
  199 | 
  200 |   test('TC-011 - Maximum-length Program Name is accepted (boundary 255 chars)', async ({ page }) => {
  201 |     // "I.G. " (5) + 250 × "P" = 255 chars total.
  202 |     const programName = `I.G. ${'P'.repeat(250)}`;
  203 |     expect(programName).toHaveLength(255);
  204 | 
  205 |     const programs = new ProgramsPage(page);
  206 |     const modal = await openNewProgramModal(page);
  207 |     await modal.fillProgramName(programName);
  208 |     await modal.fillDescription('I.G. max name');
  209 |     await clickCreateAndTrack(page, modal);
  210 | 
  211 |     await expect(modal.dialog).toBeHidden();
```