Feature: DS-1 — Create new academic program

  As an admin user, I want to create a new academic program so that I can begin designing its curriculum structure.

  # Happy paths

  Scenario: Navigate to program creation form
    Given I am logged in as admin
    When I navigate to the Programs page
    And I click "+ New Program"
    Then I see the program creation form with fields: Program Name, Description

  Scenario: Successfully create a program
    Given I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Full-stack web development program"
    And I click Create
    Then the modal closes
    And the program list shows "Web Development 2026"

  Scenario: Validation prevents empty program name
    Given I am on the program creation form
    When I leave the Program Name field empty
    Then the Create button is disabled

  Scenario: Newly created program persists after navigation
    Given I am logged in as admin
    And I am on the Programs page
    And I have created a program named "Web Development 2026" with description "Full-stack web development program"
    When I navigate to the Dashboard
    And I navigate back to the Programs page
    Then the program list shows "Web Development 2026"

  Scenario: Program creates with name only when description is left empty
    Given I am on the program creation form
    When I fill in Program Name with "I.G. Name Only Program"
    And I leave the Description field empty
    And I click Create
    Then the modal closes
    And the program list shows "I.G. Name Only Program"

  # Negative

  Scenario: Empty program name with description filled does not allow submission
    Given I am on the program creation form
    When I leave the Program Name field empty
    And I fill in Description with "Full-stack web development program"
    Then the Create button is disabled
    And no new program is added to the program list

  Scenario: Whitespace-only program name is treated as empty
    Given I am on the program creation form
    When I fill in Program Name with "   "
    And I fill in Description with "Full-stack web development program"
    Then the Create button is disabled
    And no program named "   " appears in the program list

  Scenario: Cancelling the modal discards entered values
    Given I am on the program creation form
    When I fill in Program Name with "I.G. Cancelled Program"
    And I fill in Description with "Full-stack web development program"
    And I close the modal without saving
    Then the modal closes
    And the program list does not show "I.G. Cancelled Program"
    When I click "+ New Program"
    Then the Program Name field is empty
    And the Description field is empty

  Scenario: Server failure on create surfaces an error and does not add a row
    Given I am on the program creation form
    And the create program API returns a server error
    When I fill in Program Name with "I.G. Server Error Program"
    And I fill in Description with "Full-stack web development program"
    And I click Create
    Then an error message is displayed to the user
    And the modal remains open
    And the program list does not show "I.G. Server Error Program"

  Scenario: Non-admin user cannot create a program
    Given I am logged in as a non-admin user
    When I navigate to the Programs page
    Then either the "+ New Program" button is not visible
    Or attempting to create a program returns a forbidden response
    And no new program is added to the program list

  Scenario: Duplicate program name is rejected
    Given I am logged in as admin
    And a program named "Web Development 2026" already exists in the program list
    And I am on the program creation form
    When I fill in Program Name with "Web Development 2026"
    And I fill in Description with "Another full-stack web development program"
    And I click Create
    Then an error indicating the name already exists is displayed
    And the modal remains open
    And the program list contains exactly one program named "Web Development 2026"

  # Edge cases

  Scenario: Maximum-length program name is accepted
    Given I am on the program creation form
    When I fill in Program Name with a 255-character name starting with "I.G. "
    And I fill in Description with "Full-stack web development program"
    And I click Create
    Then the modal closes
    And the program list shows the 255-character program name

  Scenario: Special characters and Unicode in program name are preserved
    Given I am on the program creation form
    When I fill in Program Name with "I.G. Renée's \"Accelerated\" Program"
    And I fill in Description with "Full-stack web development program"
    And I click Create
    Then the modal closes
    And the program list shows "I.G. Renée's \"Accelerated\" Program"

  Scenario: HTML-like text in program name is stored as plain text
    Given I am on the program creation form
    When I fill in Program Name with "I.G. <img src=x onerror=alert(1)>"
    And I fill in Description with "Full-stack web development program"
    And I click Create
    Then no JavaScript alert is triggered
    And the modal closes
    And the program list shows the literal text "I.G. <img src=x onerror=alert(1)>"

  Scenario: Very long description is accepted
    Given I am on the program creation form
    When I fill in Program Name with "I.G. Long Description Program"
    And I fill in Description with a 1000-character description
    And I click Create
    Then the modal closes
    And the program list shows "I.G. Long Description Program"

  Scenario: Rapid double-click on Create does not create duplicate programs
    Given I am on the program creation form
    When I fill in Program Name with "I.G. Double Click Program"
    And I fill in Description with "Full-stack web development program"
    And I click Create twice in quick succession
    Then exactly one program named "I.G. Double Click Program" appears in the program list

  Scenario: Pressing Escape while editing discards input
    Given I am on the program creation form
    When I fill in Program Name with "I.G. Escape Discard Program"
    And I press Escape
    Then the modal closes
    And the program list does not show "I.G. Escape Discard Program"
    When I click "+ New Program"
    Then the Program Name field is empty

# Ambiguities and gaps in acceptance criteria

# 1. Description optionality — AC2 fills a description, but no AC states whether Description is required.
#    The "Program creates with name only" scenario assumes Description is optional; confirm with PM/UX.
# 2. Validation beyond empty — AC3 covers only an empty Program Name. Whitespace-only, min/max length,
#    and duplicate-name rules are not in DS-1 ACs (duplicate policy may be defined in DS-3).
# 3. Success feedback — AC2 asserts modal close and list update only; no AC for toast, banner, or
#    confirmation copy after a successful create.
# 4. Error UX on failure — No AC specifies behavior when the create API fails (error message copy,
#    whether the modal stays open, or retry behavior).
# 5. Role gating — The user story says "admin user," but ACs do not define the non-admin experience
#    (hidden button vs visible-with-403 vs disabled control).
# 6. List ordering — AC2 does not specify where the new row appears (top, bottom, or alphabetical).
# 7. Accessibility — No AC for keyboard navigation, focus trap in the modal, focus return on close,
#    or screen-reader announcements.
# 8. Persistence contract — AC2 asserts client-side list update; server contract (POST status code,
#    response body, idempotency) is not defined.
