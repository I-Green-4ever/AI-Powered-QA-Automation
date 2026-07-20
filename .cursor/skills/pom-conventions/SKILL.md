---
name: pom-conventions
description: Page Object Model conventions for Playwright tests in this project. Apply whenever generating, refactoring, or reviewing any Playwright test that interacts with the Didaxis UI - even if the user doesn't say "POM". Tests should never contain inline locators.
---

# Page Object Model Conventions

All UI interactions go through Page Objects in `pages/`. Tests describe intent; POMs handle mechanics.

Before creating or changing POMs, explore the live Didaxis app with the **Playwright MCP** (`browser_navigate`, `browser_snapshot`, or `browser_run_code_unsafe`) against `DIDAXIS_URL` from `.env`. Confirm roles, labels, and dialog names on the current build — do not copy locators from old specs without verifying.

## Didaxis UI map (MCP-verified)

Use this structure unless MCP shows the UI has changed.

| Class | Scope | Route / trigger |
|-------|--------|-----------------|
| `LoginPage` | Sign-in form | `/login` |
| `AppShell` | Shared sidebar nav + sign out | Present on all authenticated routes |
| `DashboardPage` | Dashboard heading and quick-start cards | `/` after login |
| `ProgramsPage` | Programs list, table, `+ New Program` | `/programs` |
| `NewProgramModal` | Create dialog | Opened from `ProgramsPage` |
| `EditProgramModal` | Edit dialog | Opened from a program row |
| `ProgramRow` | Single table row actions | Scoped under `ProgramsPage` |

**`LoginPage`** — `getByLabel('Email')`, `getByLabel('Password')`, `getByRole('button', { name: 'Sign In' })`. Landmark after login: nav button matching `/Programs/`.

**`AppShell`** — `getByRole('navigation')` or nav buttons: `Dashboard`, `Programs`, `Calendar`, `Validation`, `Scheduler`, `Export`, `Settings`, `Sign out`. Methods: `goToPrograms()`, `goToDashboard()`, `signOut()`.

**`ProgramsPage`** — `getByRole('heading', { name: 'Programs' })`, `getByRole('button', { name: '+ New Program' })`, `getByRole('table')`. Compose `readonly newProgram = new NewProgramModal(this.page)`. Row helpers return `ProgramRow` instances. Empty-state copy may include "no programs" / "create your first" — expose as locators, do not assert in the POM.

**`NewProgramModal`** — `getByRole('dialog', { name: 'New Program' })`, labels `Program Name` / `Description`, buttons `Create` (disabled until name filled), `Cancel`, optional `Show AI Generation Config`.

**`EditProgramModal`** — `getByRole('dialog', { name: 'Edit Program' })`, same fields, buttons `Save` and `Cancel`.

**`ProgramRow`** — `page.getByRole('row', { name: programName })`. Row actions (verify with MCP): prefer `getByRole('button', { name: /^Edit / })` and `/^Delete /` when the build exposes accessible names; legacy specs may still use `✏️` / `🗑` — encapsulate either pattern here, not in tests.

**Delete confirmation** — native `window.confirm`, not a Mantine dialog. Handle in `ProgramsPage` via `page.once('dialog', …)` inside action methods (`confirmDelete`, `cancelDelete`); never model as a separate modal POM.

**Unauthenticated access** — `/programs` without session redirects to `/login` (Sign In visible). Tests that need a guest session clear cookies/storage; authenticated suites use `storageState` from `auth.setup.ts` (see `lib/auth.ts`).

## Steps

1. **One Page Object class per page or distinct component.** Examples: `LoginPage`, `ProgramsPage`, `NewProgramModal`, `EditProgramModal`, `ProgramRow`, `AppShell`.

2. **Define locators as `readonly` properties in the constructor**, using `getByRole`, `getByLabel`, or `getByText` — never CSS selectors or XPath.

3. **Provide methods for user actions:** `goto`, `clickX`, `fillY`, `submit`. Methods perform actions; they do not assert.

4. **No assertions inside Page Objects.** All `expect(...)` calls live in spec files under `tests/`, never in `pages/`.

5. **Compose POMs when a page contains distinct components** — e.g. `ProgramsPage` holds a `NewProgramModal` instance and factory methods that return `ProgramRow`.

6. **Import POMs at the top of each spec; instantiate with `new XxxPage(page)`.** Specs orchestrate POMs + `expect`; they must not call `page.getByRole` / `page.getByLabel` directly for Didaxis UI.

7. **Keep API cleanup and tracking out of POMs.** Program creation/deletion tracking stays in `fixtures/cleanup.fixture.ts`, `tests/helpers/program.ts`, and `lib/program-tracker.ts` per the `api-cleanup` skill. POMs may expose `clickCreate()`; specs or helpers call `clickCreateAndTrack` / `trackProgram`.

8. **When refactoring existing specs**, move duplicated locator blocks into the POM map above first; run a focused Playwright test to confirm behavior.

## Output

- Page Object files in `pages/` (e.g. `pages/login.page.ts`, `pages/programs.page.ts`, `pages/components/new-program.modal.ts`).
- Specs in `tests/` that import POMs only — no inline Didaxis locators.

## Example

**`pages/programs.page.ts`**

```typescript
import type { Page, Locator } from '@playwright/test';
import { NewProgramModal } from './components/new-program.modal';

export class ProgramsPage {
  readonly heading: Locator;
  readonly newProgramButton: Locator;
  readonly newProgram: NewProgramModal;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Programs' });
    this.newProgramButton = page.getByRole('button', { name: '+ New Program' });
    this.newProgram = new NewProgramModal(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/programs');
  }

  async openNewProgram(): Promise<NewProgramModal> {
    await this.newProgramButton.click();
    return this.newProgram;
  }

  programRow(programName: string): ProgramRow {
    return new ProgramRow(this.page, programName);
  }
}
```

**`tests/ds1-create-program.spec.ts` (fragment)**

```typescript
import { test, expect } from '../fixtures/cleanup.fixture';
import { ProgramsPage } from '../pages/programs.page';

test('TC-001 - opens creation form', async ({ page }) => {
  const programs = new ProgramsPage(page);
  await programs.goto();
  const modal = await programs.openNewProgram();

  await expect(modal.dialog).toBeVisible();
  await expect(modal.programNameInput).toBeVisible();
});
```
