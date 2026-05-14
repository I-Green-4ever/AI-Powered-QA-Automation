# Prompt Template "Test Plan from a Jira Ticket"

## Role

I'm a senior QA engineer reviewing the feature described below.

## Task: "As an admin user, I want to edit an existing program's details so that I can correct or update program information after creation."

Create a detailed test plan for the "Edit existing program details" feature.

## Acceptance Criteria (AC):

Scenario: Open program for editing  
Given I am on the Programs page  
And a program "Web Development 2026" exists  
When I click the edit icon on "Web Development 2026"  
Then I see the edit form pre-populated with the program's current data

Scenario: Successfully edit a program name  
Given I am editing "Web Development 2026"  
When I change the Name to "Web Development 2026 - Updated"  
And I click Save  
Then the modal closes  
And the program list immediately shows "Web Development 2026 - Updated"

Scenario: Edit preserves unchanged fields  
Given I am editing a program  
When I only change the Description  
And I click Save  
Then the Name and other fields remain unchanged

## Actions: Edit Program Flow

User clicks ✏️ icon on a program row → “Edit Program” modal opens with pre-populated data

User modifies fields

User clicks “Save” → API call to update program

On success: modal closes, program list refreshes with updated data visible immediately

On failure: error displayed

## Validations:
Program Setup — Field Definitions
Program Entity
Field			Type		Required	Constraints					Default
---------------------------------------------------------------------------------------------------------------
Name			string		Yes		Max 100 characters, unique per organization	—

Description		string		No		Max 500 characters				empty

Total Hours		number		No		Min 1, required for AI curriculum generation	null

Default Session Hours	number		No		0.5 – 12, step 0.5				4

Default Exam Hours	number		No		0.5 – 12, step 0.5				3

Target Audience		string		No		Free text					empty

Focus Areas		string		No		Free text					empty

Sync/Async Ratio	number		No		0 – 100 (percentage sync)			70


## Refresh Behavior (Critical)
After any mutation (create, edit, delete), the program list MUST immediately reflect the change without requiring a manual page refresh.

This is a core UX requirement. The list is re-fetched from the server after every successful mutation to ensure data consistency.


## Modal Behavior
Create and Edit modals can be closed via the X button, Cancel button, or clicking outside

The “Create” button is disabled when Program Name is empty

The “Save” button (edit) is disabled when Program Name is empty

Both modals have a collapsible “AI Generation Config” section


## Form Layout:
The "edit" modals show:

Always visible: 				Program Name (TextInput), Description (Textarea)

Collapsible section “AI Generation Config”: 	Total Hours, Default Session Hours, Default Exam Hours, Target Audience, Focus Areas, Sync/Async Ratio slider

## Notes:

The “Create” button is disabled when the Program Name field is empty
The Name field is trimmed on submit — whitespace-only names are effectively rejected
The AI Generation Config fields are optional but Total Hours is required for the “Generate Curriculum” feature


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

- Structured test plan in Markdown
- Use real field names and values, not placeholders
- At the end: list any ambiguities or gaps in the ACs
