Feature: DS-3 — Program name validation and duplicate prevention

  As an admin user
  I want invalid and duplicate program names to be rejected
  So that program data remains valid and unique

  # Happy paths

  Scenario: TC-001 — Accept the required special-character program name
    Given I am signed in as an admin
    And I am on the New Program form
    When I enter "Informatique & IA - Niveau 2" as the Program Name
    And I enter "Programme spécialisé en intelligence artificielle" as the Description
    And I click Create
    Then the New Program form closes
    And exactly one program named "Informatique & IA - Niveau 2" appears in the Programs list

  Scenario: TC-002 — Accept accented characters, apostrophes, and quotation marks
    Given I am signed in as an admin
    And I am on the New Program form
    When I enter "Renée's \"Accelerated\" IA Programme" as the Program Name
    And I click Create
    Then the New Program form closes
    And exactly one program named "Renée's \"Accelerated\" IA Programme" appears in the Programs list

  # Negative

  Scenario: TC-003 — Reject a program name containing only three spaces
    Given I am signed in as an admin
    And I am on the New Program form
    When I enter "   " as the Program Name
    Then Create is disabled
    And no create-program request is sent
    And the New Program form remains open

  Scenario: TC-004 — Reject an empty program name
    Given I am signed in as an admin
    And I am on the New Program form
    When I leave Program Name empty
    Then Create is disabled
    And no create-program request is sent

  Scenario: TC-005 — Reject an exact duplicate program name
    Given a program named "Web Development 2026" exists
    And I am on the New Program form
    When I enter "Web Development 2026" as the Program Name
    And I click Create
    Then the New Program form remains open
    And I see an error indicating that "Web Development 2026" already exists
    And exactly one program named "Web Development 2026" exists

  Scenario: TC-006 — Preserve entered values after duplicate rejection
    Given a program named "Web Development 2026" exists
    And I am on the New Program form
    When I enter "Web Development 2026" as the Program Name
    And I enter "Full-stack web curriculum" as the Description
    And I click Create
    Then the New Program form remains open
    And Program Name still contains "Web Development 2026"
    And Description still contains "Full-stack web curriculum"

  # Edge cases

  Scenario: TC-007 — Treat mixed whitespace as an empty program name
    Given I am signed in as an admin
    And I am on the New Program form
    When Program Name contains only a tab, a space, a non-breaking space, and a newline
    Then Create is disabled
    And no create-program request is sent

# Ambiguities and gaps in acceptance criteria
#
# 1. Duplicate comparison is not defined for case variants, leading/trailing whitespace,
#    Unicode normalization, or invisible characters.
# 2. Maximum and minimum program-name lengths are not specified.
# 3. The exact duplicate-error text, placement, and accessibility association are not specified.
# 4. The ticket does not say whether the same validation rules apply while editing a program.
# 5. The ticket does not define whether a deleted program's name can be reused.
