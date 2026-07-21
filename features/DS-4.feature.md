Feature: DS-4 — Delete program with confirmation

  As an admin user
  I want deletion to require confirmation
  So that I do not remove programs accidentally

  # Happy paths

  Scenario: TC-001 — Show confirmation before deleting Test Program
    Given I am signed in as an admin
    And a program named "Test Program" exists
    When I activate Delete for "Test Program"
    Then a confirmation dialog appears
    And no delete-program request is sent before I respond

  Scenario: TC-002 — Confirm deletion removes Test Program
    Given I am signed in as an admin
    And a program named "Test Program" exists
    When I activate Delete for "Test Program"
    And I confirm deletion
    Then "Test Program" is removed from the Programs list

  Scenario: TC-003 — Cancel deletion keeps Test Program
    Given I am signed in as an admin
    And a program named "Test Program" exists
    When I activate Delete for "Test Program"
    And I cancel deletion
    Then "Test Program" remains in the Programs list
    And no delete-program request is sent

  # Negative

  Scenario: TC-004 — Dismissing confirmation does not delete the program
    Given I am signed in as an admin
    And a program named "Program To Keep" exists
    When I activate Delete for "Program To Keep"
    And I dismiss the confirmation
    Then "Program To Keep" remains in the Programs list
    And no delete-program request is sent

  # Edge cases

  Scenario: TC-005 — Confirmation identifies a program with special characters
    Given I am signed in as an admin
    And a program named "Renée's \"Accelerated\" Program" exists
    When I activate Delete for "Renée's \"Accelerated\" Program"
    Then the confirmation message contains "Renée's \"Accelerated\" Program"
    When I confirm deletion
    Then "Renée's \"Accelerated\" Program" is removed from the Programs list

# Ambiguities and gaps in acceptance criteria
#
# 1. The ticket does not specify whether confirmation is a native browser dialog or an in-app modal.
# 2. The required confirmation message is not specified.
# 3. Behavior for API failures, timeouts, and concurrent deletion is not defined.
# 4. The ticket does not define non-admin permissions or accessibility requirements.
