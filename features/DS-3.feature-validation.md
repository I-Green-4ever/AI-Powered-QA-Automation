Feature: DS-3 — Program name validation and duplicate prevention

  As an admin user, I want the system to prevent invalid or duplicate program names so that data integrity is maintained.

  # Happy paths

  Scenario: Accept program name with special characters (AC2)
    Given I am on the program creation form
    When I enter "Informatique & IA - Niveau 2" as the program name
    And I fill in Description with a valid value
    And I click Create
    Then the program is created successfully
    And the program list shows "Informatique & IA - Niveau 2" rendered as plain text (not HTML-encoded)

  Scenario: Smart quotes, apostrophe, and accented Unicode are accepted
    Given I am on the program creation form
    When I enter "I.G. Renée's \"Accelerated\" 2026" as the program name
    And I click Create
    Then the program is created successfully
    And reopening Edit shows the same characters byte-for-byte

  Scenario: Internal whitespace is preserved; only edges are trimmed
    Given I am on the program creation form
    When I enter "   I.G. Trim Edges Only   " as the program name
    And I click Create
    Then the program list shows "I.G. Trim Edges Only"
    And the program list does not show "   I.G. Trim Edges Only   "

  Scenario: Mixed case, digits, and punctuation all create successfully
    Given I am on the program creation form
    When I enter "I.G. CS-101 / 2026 (Cohort #2)" as the program name
    And I click Create
    Then the program is created successfully

  Scenario: Re-create after delete succeeds when name reuse is allowed
    Given a program "I.G. Reusable" exists
    When I delete "I.G. Reusable" and confirm
    And I create a new program named "I.G. Reusable"
    Then the program is created successfully

  # Negative

  Scenario: Reject program name with only whitespace (AC1)
    Given I am on the program creation form
    When I enter "   " as the program name
    And I fill in Description with a valid value
    And I attempt to click Create
    Then the form is not submitted (name is trimmed, treated as empty)
    And the Create button is disabled
    And no new program row is added

  Scenario: Completely empty name is rejected
    Given I am on the program creation form
    When I leave the Program Name field empty
    Then the Create button is disabled
    And pressing Enter in the Program Name field does not submit the form

  Scenario: Tabs, newlines, and non-breaking-space whitespace are treated as empty
    Given I am on the program creation form
    When I enter a name consisting only of tab, space, non-breaking space, and newline characters
    And I attempt to submit
    Then the Create button is disabled
    And the form is not submitted

  Scenario: Reject duplicate program name (AC3)
    Given a program "Web Development 2026" already exists
    When I try to create a new program with the same name "Web Development 2026"
    Then I see an error indicating the name already exists
    And the modal stays open with the entered name preserved
    And exactly one program named "Web Development 2026" remains in the list

  Scenario: Duplicate detection ignores leading and trailing whitespace in the new entry
    Given a program "Web Development 2026" already exists
    When I try to create a new program with name "   Web Development 2026   "
    Then the duplicate is rejected
    And exactly one program named "Web Development 2026" remains in the list

  Scenario: Duplicate detection is case-insensitive
    Given a program "Web Development 2026" already exists
    When I try to create a new program with name "web development 2026"
    Then the duplicate is rejected
    And no second row appears in any case variant

  Scenario: Error copy for duplicate is human-readable and field-scoped
    Given a program "I.G. ErrorCopy" already exists
    When I try to create a new program with the same name
    Then I see an error message mentioning the name is already taken or duplicate
    And the error is associated with the Program Name field for accessibility

  Scenario: After a duplicate error, fixing the name and re-clicking Create succeeds
    Given a program "I.G. Web Development 2026" already exists
    When I try to create a duplicate and then change the name to "I.G. Web Development 2026 - Cohort B"
    And I click Create
    Then the modal closes
    And both programs appear in the list
    And the Description value was preserved through the retry

  Scenario: Duplicate detection on Edit when renaming to an existing program
    Given programs "I.G. Existing A" and "I.G. Existing B" exist
    When I edit "I.G. Existing B" and change the name to "I.G. Existing A"
    And I click Save
    Then the rename is rejected
    And both original program names remain in the list

  Scenario: Whitespace-only name on Edit is rejected
    Given a program "I.G. Edit WS-Only" exists
    When I edit it and change the Program Name to "   "
    Then the Save button is disabled
    And the original program name remains in the list

  # Edge cases

  Scenario: RTL Unicode (Arabic) is accepted and preserved
    Given I am on the program creation form
    When I enter "I.G. برنامج تجريبي" as the program name
    And I click Create
    Then the program is created successfully
    And reopening Edit shows the same Arabic text

  Scenario: Emoji and supplementary-plane Unicode are accepted
    Given I am on the program creation form
    When I enter "I.G. 🎓 Cohort 2026" as the program name
    And I click Create
    Then the program is created successfully
    And the emoji renders correctly in the program list

  Scenario: Combining vs precomposed Unicode is treated consistently for duplicates
    Given a program named with precomposed "é" (U+00E9) exists
    When I try to create a program with the same visual name using combining acute (e + U+0301)
    Then the duplicate is rejected

  Scenario: Invisible zero-width characters do not bypass duplicate detection
    Given a program "I.G. Web Development 2026" exists
    When I try to create a program with a zero-width space injected in the name
    Then the duplicate is rejected after invisible characters are stripped

  Scenario: HTML-like text in the name is stored as text (XSS-safe)
    Given I am on the program creation form
    When I enter "I.G. <img src=x onerror=alert(1)>" as the program name
    And I click Create
    Then the program is created successfully
    And no JavaScript alert is triggered

  Scenario: Very long valid name (255 characters) with allowed special chars persists
    Given I am on the program creation form
    When I enter a 255-character name containing accented characters and hyphens
    And I click Create
    Then the program is created successfully
    And a second create with the same long name is rejected as duplicate

  Scenario: Race — two clients create the same name nearly simultaneously
    Given two browser sessions are on the program creation form
    When both submit the same program name at nearly the same time
    Then exactly one program is created
    And the losing session sees a duplicate error with the modal still open

# Ambiguities and gaps in acceptance criteria

# 1. Edge trimming on save — AC1 covers whitespace-only rejection but does not state whether
#    leading/trailing spaces on otherwise valid names are trimmed before save (spec assumes yes).
# 2. Case sensitivity — AC3 does not specify whether "Web Development 2026" and
#    "web development 2026" are duplicates; spec assumes case-insensitive uniqueness.
# 3. Error UX detail — AC3 requires "an error indicating the name already exists" but does not
#    define copy, placement (inline vs alert), or aria-describedby for accessibility.
# 4. Name reuse after delete — ACs do not state whether a deleted program's name can be reused;
#    spec assumes active-program-only duplicate check.
# 5. Unicode normalization — ACs do not define NFC/NFD handling for visually identical names
#    (precomposed vs combining characters).
# 6. Invisible characters — ACs do not mention zero-width or other invisible Unicode bypass risks.
# 7. Max length — Confluence Field Definitions cite max 100 characters; spec edge case uses 255
#    based on observed API behavior — confirm authoritative limit with PM.
# 8. Edit-flow validation — ACs only describe create form; duplicate/whitespace rules on Edit
#    are inferred from data-integrity intent and cross-cut DS-2.
