---
name: jira-bug-reporter
description: Analyzes Playwright test failures, identifies root cause, and creates detailed Jira bug tickets. Use when a test fails and needs investigation and bug reporting.
---


# Jira Ticket to Gherkin Test Cases

Generate reviewable test scenarios from a Jira ticket. The Gherkin output is a human-readable checkpoint - the QA reviews it before any Playwright code gets written.

## Steps

1. Read the referenced Jira ticket using the Atlassian MCP. Extract the title, description, and every acceptance criterion.

2. Generate test scenarios as a Gherkin `.feature` file:
   - One `Feature`, named after the ticket
   - Cover every acceptance criterion with at least one `Scenario`
   - Add negative scenarios - what should NOT happen
   - Add edge-case scenarios - boundaries, empty inputs, duplicates, special characters, max length

3. Write each scenario in Given / When / Then form. `Given` sets the starting state, `When` is the action under test, `Then` is the observable expected outcome.

4. Group scenarios with comments: `# Happy paths`, `# Negative`, `# Edge cases`.

5. Use real, specific values from the ticket - never placeholders.

6. End the file with a comment block listing any ambiguities or gaps found in the ticket's acceptance criteria, so the QA can resolve them.

## Output

Save as `Block6/features/<ticket-key>.feature-create.md`.

## Example

TC-XXX - Test title

Scenario: Navigate to program creation form
  Given I am logged in as admin
  When I navigate to the Programs page
  And I click "+ New Program"
  Then I see the program creation form with fields: Program Name, Description

