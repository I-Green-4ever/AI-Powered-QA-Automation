Feature: DS-1 — Create new academic program

  As an admin user
  I want to create a new academic program
  So that I can begin designing its curriculum structure

  # Happy paths

  Scenario: TC-001 — Open the program creation form
    Given I am signed in as an admin
    And I am on the Programs page
    When I click "+ New Program"
    Then the New Program form appears
    And it contains a Program Name field
    And it contains a Description field

  Scenario: TC-002 — Create Web Development 2026
    Given I am signed in as an admin
    And I am on the New Program form
    When I enter "Web Development 2026" as the Program Name
    And I enter "Full-stack web development program" as the Description
    And I click Create
    Then the New Program form closes
    And exactly one program named "Web Development 2026" appears in the Programs list
    And its row shows "Full-stack web development program"

  # Negative

  Scenario: TC-003 — Disable Create when Program Name is empty
    Given I am signed in as an admin
    And I am on the New Program form
    When I leave Program Name empty
    Then Create is disabled
    And no create-program request is sent

  Scenario: TC-004 — Description does not make an empty Program Name valid
    Given I am signed in as an admin
    And I am on the New Program form
    When I leave Program Name empty
    And I enter "Full-stack web development program" as the Description
    Then Create is disabled
    And no create-program request is sent

  # Edge cases

  Scenario: TC-005 — Treat three spaces as an empty Program Name
    Given I am signed in as an admin
    And I am on the New Program form
    When I enter "   " as the Program Name
    Then Create is disabled
    And no create-program request is sent

# Ambiguities and gaps in acceptance criteria
#
# 1. The ticket does not state whether Description is optional or has a length limit.
# 2. Program Name length, whitespace normalization, and duplicate handling are not defined here.
# 3. Success notifications, list ordering, and persistence after navigation are not specified.
# 4. Create API failure behavior and non-admin permissions are not defined.
# 5. Keyboard and screen-reader requirements are not stated.
