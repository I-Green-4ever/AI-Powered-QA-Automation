Feature: DS-2 — Edit existing program details

  As an admin user, I want to edit an existing program's details so that I can correct or update program information after creation.

  # Happy paths

  Scenario: Open program for editing
    Given I am logged in as admin
    And I am on the Programs page
    And a program "Web Development 2026" with description "Full-stack web development program" exists in the program list
    When I click the edit icon on "Web Development 2026"
    Then I see the Edit Program modal
    And the edit form is pre-populated with the program's current data

  Scenario: Edit form shows current program name and description
    Given I am logged in as admin
    And I am on the Programs page
    And a program "Web Development 2026" with description "Full-stack web development program" exists in the program list
    When I click the edit icon on "Web Development 2026"
    Then the Program Name field value is "Web Development 2026"
    And the Description field value is "Full-stack web development program"

  Scenario: Successfully edit a program name
    Given I am logged in as admin
    And I am editing "Web Development 2026"
    When I change the Program Name to "Web Development 2026 - Updated"
    And I click Save
    Then the modal closes
    And the program list immediately shows "Web Development 2026 - Updated"
    And the program list does not show "Web Development 2026"

  Scenario: Edited program name persists after navigation
    Given I am logged in as admin
    And I am on the Programs page
    And a program named "Web Development 2026 - Updated" exists
    When I navigate to the Dashboard
    And I navigate back to the Programs page
    Then the program list shows "Web Development 2026 - Updated"
    And the program list does not show "Web Development 2026"

  Scenario: Editing both name and description updates both fields
    Given I am logged in as admin
    And I am editing a program named "I.G. Edit Both Fields" with description "I.G. before"
    When I change the Program Name to "I.G. Edit Both Fields Updated"
    And I change the Description to "I.G. after"
    And I click Save
    Then the modal closes
    And the program list shows "I.G. Edit Both Fields Updated" with description "I.G. after"

  Scenario: Edit preserves unchanged fields when only description is changed
    Given I am logged in as admin
    And I am editing a program named "I.G. Desc Only Edit" with description "I.G. before"
    When I change the Description to "I.G. after"
    And I leave the Program Name unchanged
    And I click Save
    Then the modal closes
    And the program list shows "I.G. Desc Only Edit" with description "I.G. after"

  Scenario: Edit preserves unchanged fields when only name is changed
    Given I am logged in as admin
    And I am editing a program named "I.G. Name Only Edit" with description "keep me"
    When I change the Program Name to "I.G. Name Only Edit Updated"
    And I leave the Description unchanged
    And I click Save
    Then the modal closes
    And the program list shows "I.G. Name Only Edit Updated" with description "keep me"

  Scenario: Re-opening edit after save shows the latest saved values
    Given I am logged in as admin
    And a program named "Web Development 2026 - Updated" with description "Full-stack web development program" exists in the program list
    When I click the edit icon on "Web Development 2026 - Updated"
    Then the Program Name field value is "Web Development 2026 - Updated"
    And the Description field value is "Full-stack web development program"

  # Negative

  Scenario: Empty program name disables Save on edit
    Given I am logged in as admin
    And I am editing a program named "Web Development 2026 - Updated"
    When I clear the Program Name field
    Then the Save button is disabled
    And no update is submitted to the server

  Scenario: Whitespace-only program name is treated as empty on edit
    Given I am logged in as admin
    And I am editing a program named "Web Development 2026 - Updated"
    When I replace the Program Name with "   "
    Then the Save button is disabled
    And the program list still shows "Web Development 2026 - Updated"

  Scenario: Cancelling the edit modal discards in-progress changes
    Given I am logged in as admin
    And I am editing a program named "Web Development 2026 - Updated"
    When I change the Program Name to "I.G. DiscardMe"
    And I close the modal without saving
    Then the modal closes
    And the program list still shows "Web Development 2026 - Updated"
    When I click the edit icon on "Web Development 2026 - Updated"
    Then the Program Name field value is "Web Development 2026 - Updated"

  Scenario: Server failure on save surfaces an error and does not update the list
    Given I am logged in as admin
    And I am editing a program named "Web Development 2026 - Updated"
    And the update program API returns a server error
    When I change the Program Name to "I.G. Server Error Edit"
    And I click Save
    Then an error message is displayed to the user
    And the modal remains open
    And the program list still shows "Web Development 2026 - Updated"

  Scenario: Saving after another admin deleted the program returns a conflict error
    Given I am logged in as admin in session A
    And I am editing a program named "I.G. Conflict Edit"
    And another admin in session B has deleted "I.G. Conflict Edit"
    When I change the Program Name to "I.G. Conflict Edit Updated"
    And I click Save
    Then a not-found or conflict error is displayed
    And the program is not re-created
    And the program list no longer shows "I.G. Conflict Edit"

  Scenario: Non-admin user cannot edit programs
    Given I am logged in as a non-admin user
    And I am on the Programs page
    And a program "Web Development 2026" exists in the program list
    Then either the edit icon is not visible on "Web Development 2026"
    Or attempting to save an edit returns a forbidden response
    And the program data remains unchanged

  Scenario: Renaming a program to an existing program name is rejected
    Given I am logged in as admin
    And programs "I.G. Existing A" and "I.G. Existing B" exist in the program list
    And I am editing "I.G. Existing B"
    When I change the Program Name to "I.G. Existing A"
    And I click Save
    Then an error indicating the name already exists is displayed
    And the modal remains open
    And the program list contains exactly one program named "I.G. Existing A"
    And the program list still shows "I.G. Existing B"

  # Edge cases

  Scenario: Maximum-length program name on edit is accepted
    Given I am logged in as admin
    And I am editing a program named "I.G. Long Name Target"
    When I replace the Program Name with a 255-character name starting with "I.G. "
    And I click Save
    Then the modal closes
    And the program list shows the 255-character program name

  Scenario: Special characters and Unicode in edited name are preserved
    Given I am logged in as admin
    And I am editing a program named "I.G. Unicode Edit Source"
    When I change the Program Name to "I.G. Renée's \"Accelerated\" Updated"
    And I click Save
    Then the modal closes
    And the program list shows "I.G. Renée's \"Accelerated\" Updated"
    When I click the edit icon on "I.G. Renée's \"Accelerated\" Updated"
    Then the Program Name field value is "I.G. Renée's \"Accelerated\" Updated"

  Scenario: HTML-like text in edited name is stored as plain text
    Given I am logged in as admin
    And I am editing a program named "I.G. XSS Edit Source"
    When I change the Program Name to "I.G. <img src=x onerror=alert(1)>"
    And I click Save
    Then no JavaScript alert is triggered
    And the modal closes
    And the program list shows the literal text "I.G. <img src=x onerror=alert(1)>"

  Scenario: Editing one row of a legacy duplicate-name pair targets only that row
    Given I am logged in as admin
    And two programs named "I.G. Duplicate Name" exist in the program list from legacy data
    When I click the edit icon on the second "I.G. Duplicate Name" row
    And I change the Program Name to "I.G. Duplicate Name - Edited"
    And I click Save
    Then the modal closes
    And the program list shows one row named "I.G. Duplicate Name"
    And the program list shows one row named "I.G. Duplicate Name - Edited"

  Scenario: Saving with no changes is a no-op
    Given I am logged in as admin
    And I am editing a program named "Web Development 2026 - Updated" with description "Full-stack web development program"
    When I click Save without changing any field
    Then the modal closes
    And the program list still shows "Web Development 2026 - Updated" with description "Full-stack web development program"

  Scenario: Rapid double-click on Save does not apply duplicate updates
    Given I am logged in as admin
    And I am editing a program named "I.G. Double Save Source"
    When I change the Program Name to "I.G. Double Save Target"
    And I click Save twice in quick succession
    Then exactly one update request takes effect
    And the program list shows exactly one program named "I.G. Double Save Target"

  Scenario: Pressing Escape while editing discards changes
    Given I am logged in as admin
    And I am editing a program named "Web Development 2026 - Updated"
    When I change the Program Name to "I.G. Escape Discard Edit"
    And I press Escape
    Then the modal closes
    And the program list still shows "Web Development 2026 - Updated"

# Ambiguities and gaps in acceptance criteria

# 1. Edit entry point — AC1 says "click the edit icon" but the exact icon, accessible name, and row placement are not defined in the ticket.
#    Existing automation assumes a per-row "✏️" button next to the delete control; confirm with PM/UX.
# 2. Save button label — AC2 says "click Save" while the Create flow uses "Create"; confirm the actual edit-modal primary action label.
# 3. Validation on edit — ACs do not specify empty or whitespace-only Program Name behavior on edit; scenarios mirror DS-1 AC3 by analogy.
# 4. Description optionality — AC3 covers preserving unchanged fields but does not state whether Description may be cleared on edit.
# 5. Concurrency — No AC for two admins editing the same program simultaneously (last-write-wins vs optimistic locking).
# 6. Audit / change history — No AC for tracking who edited a program, when, or before/after values.
# 7. Success feedback — AC2 asserts modal close and list update only; no AC for toast, banner, or confirmation copy after a successful save.
# 8. Error UX on failure — No AC defines behavior when the update API fails (error copy, modal stays open, retry behavior, preserved draft values).
# 9. Role gating — The user story says "admin user," but ACs do not define the non-admin experience (hidden edit control vs visible-with-403).
# 10. Legacy duplicate rows — ACs do not address programs that already share a name from migration or imported data; defensive edit-targeting scenario assumes only the selected row changes.
# 11. Field set scope — AC3 references "other fields" but only Program Name and Description are documented; additional fields would need new coverage.
