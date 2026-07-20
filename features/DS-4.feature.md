Feature: DS-4 — Delete program with confirmation

  As an admin user, I want to delete a program I no longer need, with a confirmation step to prevent accidental deletion.

  # Happy paths

  Scenario: Delete program with confirmation (AC1)
    Given a program "Test Program" exists
    When I click the delete icon for "Test Program"
    Then I see a confirmation dialog
    And no DELETE request is sent until I confirm
    When I confirm deletion
    Then "Test Program" is removed from the program list

  Scenario: Same delete flow on an admin-created program row
    Given a program "I.G. Delete Me" exists
    When I click delete and confirm
    Then "I.G. Delete Me" is removed from the program list

  Scenario: Deletion persists across navigation
    Given a program "I.G. Delete Me" exists
    When I delete it and confirm
    And I navigate to the Dashboard and back to Programs
    Then the program is still absent from the list

  Scenario: Cancel program deletion (AC2)
    Given a program exists in the list
    When I click the delete icon
    And I see the confirmation dialog
    And I click Cancel
    Then the program still exists in the list
    And no DELETE request was sent

  Scenario: Cancel then confirm in a second attempt deletes the program
    Given a program "I.G. Keep Me" exists
    When I click delete and cancel
    Then the program remains visible
    When I click delete again and confirm
    Then the program is removed from the list

  Scenario: Cancelling on one row does not affect other rows
    Given programs "I.G. Cancel Target" and "I.G. Untouched" exist
    When I cancel deletion on "I.G. Cancel Target"
    Then both programs remain in the list

  Scenario: Name freed by delete is re-usable in a subsequent Create
    Given a program "I.G. Reusable" exists
    When I delete and confirm
    And I create a new program named "I.G. Reusable"
    Then the new program appears in the list

  Scenario: After delete success, navigating away and back still shows program absent
    Given a program "I.G. Obsolete" exists
    When I delete and confirm
    And I navigate to Dashboard and return to Programs
    Then "I.G. Obsolete" is still absent

  Scenario: Keyboard activation opens the same confirmation dialog
    Given a program "I.G. Keyboard" exists
    When I focus the delete control and press Enter
    Then I see a confirmation dialog
    And confirming removes the program from the list

  # Negative

  Scenario: Server failure on confirmed delete keeps the program in the list
    Given a program "I.G. 500 Test" exists
    And the DELETE API returns a 500 error
    When I click delete and confirm
    Then the program still appears in the list after refresh

  Scenario: Network timeout does not permanently remove the program
    Given a program "I.G. Timeout" exists
    And the DELETE request times out
    When I click delete and confirm
    Then the program still appears in the list after refresh

  Scenario: Dismissing the confirmation without explicit Cancel does not delete
    Given a program "I.G. EscClose" exists
    When I click delete and dismiss the dialog
    Then the program remains in the list
    And no DELETE request was sent

  Scenario: Non-admin user cannot delete programs (if role-gated)
    Given I am logged in as a non-admin user
    When I view the Programs page
    Then delete controls are not available or deletion is rejected with 403

  # Edge cases

  Scenario: HTML-like text in program name is rendered as plain text in the confirmation (no XSS)
    Given a program named "I.G. <img src=x onerror=alert(1)>" exists
    When I click delete
    Then the confirmation dialog shows the name as plain text
    And no JavaScript alert is triggered

  Scenario: Special characters and Unicode in program name appear in the confirmation dialog
    Given a program named "I.G. Renée's \"Accelerated\" Program" exists
    When I click delete and confirm
    Then the confirmation message contains the full program name

  Scenario: Long program name (255 characters) is handled gracefully in the confirmation dialog
    Given a program with a 255-character name exists
    When I click delete
    Then the confirmation dialog contains the full program name
    And confirming removes the program

  Scenario: Rapid double-activation of delete does not produce duplicate dialogs or requests
    Given a program "I.G. DoubleDelete" exists
    When I double-click the delete control rapidly
    Then exactly one confirmation dialog appears
    And exactly one DELETE request is sent
    And the program is removed once

  Scenario: Deleting the last program reveals an empty state
    Given only one program remains in the list
    When I delete and confirm
    Then an empty-state message is shown

  Scenario: Deleting one row of a duplicate-name pair removes only that row
    Given two programs with the same name exist (legacy data)
    When I delete one and confirm
    Then only that row is removed
    And the other row remains

  Scenario: Conflict when program was already deleted by another admin
    Given two admin sessions view the same program
    When session B deletes and confirms first
    And session A attempts delete and confirm
    Then session A sees a graceful no-longer-exists outcome without crash

# Ambiguities and gaps in acceptance criteria

# 1. Dialog type — ACs say "confirmation dialog" but do not specify native browser confirm() vs
#    custom modal; Confluence cites native dialog with text "Delete program [name]".
# 2. Cancel mechanism — AC2 says "click Cancel" but native confirm() uses OK/Cancel buttons;
#    dismissing via Escape or clicking outside is not defined.
# 3. Error UX — No AC for server failure (5xx), network timeout, or optimistic UI removal.
# 4. Role gating — User story says admin; non-admin delete behavior is unspecified.
# 5. Persistence contract — AC1 asserts list removal only; DELETE API status code and idempotency
#    on double-delete are not defined.
# 6. Empty state — No AC for UI when the last program is deleted.
# 7. Duplicate rows — No AC for deleting one of multiple rows with the same name.
# 8. Accessibility — No AC for keyboard activation of delete or screen-reader dialog announcements.
# 9. Concurrent delete — No AC for two admins deleting the same program simultaneously.
# 10. Name reuse — ACs do not state whether a deleted program's name can be re-created (inferred
#     from DS-3 duplicate policy).
