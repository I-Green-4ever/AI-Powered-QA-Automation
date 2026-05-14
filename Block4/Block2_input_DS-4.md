# Prompt Template "Test Plan from a Jira Ticket"

## Role

I'm a senior QA engineer reviewing the feature described below.

## Task: "As an admin user, I want to delete a program I no longer need, with a confirmation step to prevent accidental deletion."

Create a detailed test plan for the "Delete program with confirmation" feature.

## Acceptance Criteria (AC):

Scenario: Delete program with confirmation
  Given a program "Test Program" exists
  When I click the delete icon for "Test Program"
  Then I see a confirmation dialog
  When I confirm deletion
  Then "Test Program" is removed from the program list
Scenario: Cancel program deletion
  Given I click the delete icon for a program
  When I see the confirmation dialog
  And I click Cancel
  Then the program still exists in the list



## Flow: Delete Program Flow
User clicks 🗑 icon on a program row → browser confirmation dialog appears

Dialog text: "Delete program [name]? All its semesters and courses will be removed. This cannot be undone."

User clicks OK → API call to delete program

On success: program removed from list immediately

User clicks Cancel → no action taken



## Delete Confirmation
Deleting a program triggers a native browser confirmation dialog:

Delete program "[program name]"? All its semesters and courses will be removed. This cannot be undone.

The user must click OK to confirm or Cancel to abort.

On success: program is deleted from the list with confirmation message

On failure: error displayed



## Refresh Behavior (Critical)
After any mutation (create, edit, delete), the program list MUST immediately reflect the change without requiring a manual page refresh.

This is a core UX requirement. The list is re-fetched from the server after every successful mutation to ensure data consistency.


## Empty State
When no programs exist or all deleted, the page shows:

🎓 icon

Text: "No programs yet. Create your first program to get started."

"Create Program" button



## Requirements for the test plan:

- Cover every AC with at least one test case
- Add edge cases the ACs don't mention
  (boundary values, empty inputs, special characters, duplicates, max-length)
- Add negative test cases (what should NOT happen)
- Add the scenario if all prepopulated values were deleted
- Structure each test case as:
  - ID (TC-001, TC-002, etc.)
  - Title (expected behavior, not action)
  - Preconditions
  - Steps (numbered)
  - Expected result
  - Priority (High / Medium / Low)
- Group by: Positive flows, Negative flows, Edge cases

## Output:

- Structured test plan in Markdown as table
- Use real field names and values, not placeholders
- At the end: list any ambiguities or gaps in the ACs
