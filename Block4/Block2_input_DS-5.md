# Prompt Template "Test Plan from a Jira Ticket"

## Role

I'm a senior QA engineer reviewing the feature described below.

## Task: "As an admin user, I want to see all programs in a clear list so that I can quickly find and manage them."

Create a detailed test plan for the "Program list filtering and display" feature.

## Acceptance Criteria (AC): 

Scenario: Display program list with key details
  Given programs exist in the system
  When I navigate to the Programs page
  Then I see a list showing each program's name and description

Scenario: Empty state when no programs exist
  Given no programs exist
  When I navigate to the Programs page
  Then I see a message indicating no programs have been created
  And I see a prompt to create the first program


## Page Layout
The Programs page (/programs) displays:

Header: “Programs” title with “+ New Program” button (visible to ADMIN and EDITOR roles)

Program List: Table with program name, description preview, edit and delete action icons

Semester Panel: Appears to the right when a program row clicked — shows semesters, holidays, breaks


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
