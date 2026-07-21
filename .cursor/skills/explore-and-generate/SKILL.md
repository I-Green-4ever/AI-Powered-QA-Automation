---
name: explore-and-generate
description: >-
  Finds untested user flows by diffing live UI exploration against existing
  Playwright specs. Use when the user says "find what we're not testing",
  "explore <page> for untested flows", "expand coverage", "what flows are
  missing", "coverage gap", or asks to discover new test scenarios without a
  Jira ticket. Do NOT use when a Jira ticket or acceptance criteria already
  exist — that is jira-ticket-analyzer. This skill is for ticket-less discovery
  only. Exploration is read-only: map coverage, crawl the UI, propose one
  Gherkin plan per run; do not write or run Playwright specs here.
---

# Explore and Generate Test Plans

Discover what the app supports but the suite does not cover. Output a
reviewable Gherkin plan for **test-writer** to implement — not Playwright code.

## When to use

| Use this skill | Use jira-ticket-analyzer instead |
|----------------|----------------------------------|
| No ticket; user wants new coverage | User gave a ticket key (DS-1, DS-3, …) |
| "What aren't we testing?" | Ticket has acceptance criteria |
| Open-ended page exploration | Scenarios must trace to Jira ACs |

## Guardrails

- **Read-only exploration.** Do not create, edit, or delete app data. Do not
  write spec files, POMs, or run `npx playwright test` in this skill.
- **One flow per run.** Pick a single highest-value gap; do not batch multiple
  features into one plan.
- **Accessibility tree only.** Use `browser_snapshot` (role/name/ref YAML).
  Do not rely on screenshots or pixel descriptions to infer UI behavior.
- **Auth first.** Reuse `playwright/.auth/user.json` if present; otherwise
  sign in via the browser MCP against `DIDAXIS_URL` credentials in `.env`.

## Steps

### 1. Map covered flows

Read `tests/` — especially `ds*.spec.ts` for Didaxis. For each spec, extract:

- Page or feature under test
- User action (create, edit, delete, navigate, validate, …)
- Observable outcome asserted

Build a short inventory, e.g.:

```
Programs — covered: create, edit, delete, name validation, list display, sidebar nav
Programs — not mentioned: semester panel selection, cancel-create draft, …
```

Also skim `pages/` to see which interactions already have POM support.

### 2. Crawl the target page (browser MCP)

Use **cursor-ide-browser** (agent-browser):

1. `browser_navigate` to the target route (default base: `DIDAXIS_URL`).
2. `browser_snapshot` — this is the source of truth. Note:
   - Headings, buttons, links, dialogs, tables, hints, empty states
   - Accessible names (`getByRole`-friendly labels)
3. Interact only enough to reveal hidden flows: open modals, select rows,
   expand sections, switch tabs. After each meaningful action, snapshot again.
4. Prefer `browser_click` / `browser_fill` on snapshot refs. Use
   `browser_scroll` when elements are off-screen. Avoid screenshot-based
   reasoning.

Do not fix bugs, work around demo quirks, or mutate production-like data beyond
what is required to see the next UI state.

### 3. Enumerate real user flows

From snapshots, list flows a real user can complete — not implementation
details. Each flow needs:

- **Trigger** — what the user does first
- **Steps** — 2–5 actions in order
- **Outcome** — what changes on screen (visible text, dialog, panel, list row)

Include flows visible in the UI even if they look untested (empty states,
secondary panels, cancel/dismiss paths, keyboard entry points).

### 4. Diff against coverage

Compare step-3 flows to step-1 inventory. Label each uncovered flow:

- **Gap** — no spec exercises this path
- **Partial** — spec touches adjacent behavior but not this outcome

Drop gaps that are duplicate of an existing scenario (same trigger + same
assertion), even if worded differently.

### 5. Pick one highest-value uncovered flow

Choose exactly **one** flow for this run. State the reason in one sentence,
e.g.:

- Exercises a distinct UI region (semester panel vs CRUD list)
- Covers a dismiss/cancel path that prevents bad data
- Validates navigation or selection state other specs assume

If several gaps tie, prefer: user-visible regression risk > happy-path breadth
> edge-case depth.

### 6. Output a Gherkin test plan

Deliver a markdown Gherkin block for **test-writer**. Requirements:

- **Two scenarios only:** one positive path, one edge case for the chosen flow
- Every `Then` must be **assertable** in Playwright (visible text, dialog
  open/closed, button enabled/disabled, row count, URL, focused element)
- No vague outcomes ("works correctly", "behaves as expected")
- Use real control names from the a11y tree (`+ New Program`, `Cancel`, …)
- `Given` uses authenticated admin unless the flow is explicitly unauthenticated

Handoff note: tell test-writer to follow `pom-conventions` and
`playwright-conventions.mdc`; new specs belong in `tests/ds*.spec.ts` with
cleanup via `fixtures/cleanup.fixture.ts`.

## Output template

```markdown
## Coverage snapshot
- Page: <route>
- Already covered: <bullets from step 1>
- Explored via a11y tree: <date or "this session">

## Selected gap (one flow)
**Flow:** <short name>
**Why this one:** <one sentence>

## Gherkin test plan

Feature: <Page> — <flow name> (discovered)

  # Positive path
  Scenario: <TC-style title>
    Given I am logged in as admin
    And I am on the <Page> page
    When <actions from exploration>
    Then <assertable observable>
    And <assertable observable>

  # Edge case
  Scenario: <TC-style title>
    Given I am logged in as admin
    And <edge precondition>
    When <actions>
    Then <assertable observable>

## Locator hints (from a11y tree)
- <control>: <role + accessible name>
- ...

## For test-writer
- Suggested file: `tests/ds<N>-<slug>.spec.ts`
- POM updates: <pages/*.ts methods needed, or "none">
```

Save to `features/explore-<page-slug>-<flow-slug>.feature.md` unless the user
asks for chat-only output.

## Example (abbreviated)

**Gap chosen:** Selecting a program opens the semester management panel — no
existing spec asserts the right-hand panel context.

```gherkin
Scenario: Selecting a program reveals the semester panel
  Given I am logged in as admin
  And I am on the Programs page
  And a program "Semester Panel Program" exists in the list
  When I click the program name "Semester Panel Program"
  Then I do not see "Select a program to manage semesters"
  And I see "Semesters & scheduling config"
  And I see the button "+ Semester"

Scenario: Switching selection updates the semester panel
  Given I am logged in as admin
  And programs "Alpha" and "Beta" exist in the list
  And I have selected program "Alpha"
  When I click the program name "Beta"
  Then the semester panel shows "Beta"
  And the semester panel does not show "Alpha"
```
