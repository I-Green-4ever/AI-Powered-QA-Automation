# Prompt Template "Test Plan from a Jira Ticket"

## Role

I'm a senior QA engineer reviewing the feature described below.

## Task: "As an admin user, I want the system to prevent invalid or duplicate program names so that data integrity is maintained."

Create a detailed test plan for the "Program name validation and duplicate prevention" feature.

## Acceptance Criteria (AC):

Scenario: Reject program name with only whitespace
  Given I am on the program creation form
  When I enter "   " as the program name
  And I click Create
  Then the form is not submitted (name is trimmed, treated as empty)

Scenario: Reject program name with only whitespace
  Given I am on the program editing form
  When I edit the program name with "   "
  And I click Save
  Then the form is not submitted (name is trimmed, treated as empty)

Scenario: Accept program name with special characters
  Given I am on the program creation form
  When I enter "Informatique & IA - Niveau 2" as the program name
  And I fill other required fields
  And I click Create
  Then the program is created successfully

Scenario: Accept program name with special characters
  Given I am on the program editing form
  When I edit the program name with "Informatique & IA - Niveau 2"
  And I fill other required fields
  And I click Save
  Then the program is updated successfully

Scenario: Reject duplicate program name
  Given a program "Web Development 2026" already exists
  When I try to create a new program with the same name
  Then I see an error indicating the name already exists

Scenario: Reject duplicate program name
  Given a program "Web Development 2026" already exists
  When I try to edit a program with the same name
  Then I see an error indicating the name already exists

## Actions: Create and Edit
On Create, User clicks on "Save" button, Modal closes, program appears in list immediately
On Edit, User clicks on "Save" button, Modal closes, list immediately reflects updated data

User clicks "Save" -> API call to update program

On success: modal closes, program list refreshes with updated data visible immediately

On failure: error displayed

## Client-Side Validation and Errors on Create & Edit:
Rule                                   Trigger                                                  Error Message
---------------------------------------------------------------------------------------------------------------------------------
Program name is empty                  Create/Save button disabled when name field is empty     Button disabled (no explicit error message)

Program name is whitespace only        On submit -- name is trimmed, empty check blocks submission Modal stays open, no submission

## Server-Side Validation
Rule                                           Response        Expected Behavior
------------------------------------------------------------------------------------------------------------
Duplicate program name (within organization)   400 / 409       Error displayed to user

Name exceeds 100 characters                    400             Error displayed to user

Description exceeds 500 characters             400             Error displayed to user

## Refresh Behavior (Critical)
After any mutation (create, edit, delete), the program list MUST immediately reflect the change without requiring a manual page refresh.

This is a core UX requirement. The list is re-fetched from the server after every successful mutation to ensure data consistency.

## Modal Behavior
Create and Edit modals can be closed via the X button, Cancel button, or clicking outside

The "Create" button is disabled when Program Name is empty

The "Save" button (edit) is disabled when Program Name is empty

Both modals have a collapsible "AI Generation Config" section

## Form Layout:
The "edit" modals show:

Always visible: Program Name (TextInput), Description (Textarea)

Collapsible section "AI Generation Config": Total Hours, Default Session Hours, Default Exam Hours, Target Audience, Focus Areas, Sync/Async Ratio slider

## Notes:

The "Create" button is disabled when the Program Name field is empty
The Name field is trimmed on submit -- whitespace-only names are effectively rejected
The AI Generation Config fields are optional but Total Hours is required for the "Generate Curriculum" feature

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

- Structured test plan in Markdown and table
- Use real field names and values, not placeholders
- At the end: list any ambiguities or gaps in the ACs
