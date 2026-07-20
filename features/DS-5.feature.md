Feature: DS-5 — Program List & Display

  As an admin user, I want to view a list of academic programs with their names and descriptions,
  so that I can see what exists at a glance and know when no programs have been created yet.

  # Happy paths

  Scenario: Programs page renders a list with name and description (AC1)
    Given I am logged in as admin
    And a program "I.G. Display AC1" exists with description "I.G. display ac1 description"
    When I navigate to the Programs page
    Then I see the "Programs" heading
    And the list row for "I.G. Display AC1" shows both the program name and description

  Scenario: A program created in the same session appears in the list (cross-cuts DS-1)
    Given I am logged in as admin
    When I create a program "I.G. Display Smoke" with description "I.G. desc smoke"
    Then the program list shows "I.G. Display Smoke" with its description

  Scenario: Multiple programs render side-by-side without overlap
    Given programs "I.G. Multi A", "I.G. Multi B", and "I.G. Multi C" exist with distinct descriptions
    When I navigate to the Programs page
    Then each program row shows its own name and description
    And no row displays another program's description

  Scenario: Empty state shows a "no programs yet" message and a create prompt (AC2)
    Given I am logged in as admin
    And no programs exist in the tenant
    When I navigate to the Programs page
    Then I see the message "No programs yet. Create your first program to get started."
    And I see a "Create Program" button or "+ New Program" affordance

  Scenario: Deleting the last program triggers the empty state (cross-cuts DS-4)
    Given only one program "I.G. Solo" exists
    When I delete "I.G. Solo" and confirm
    Then the program row disappears
    And the empty-state message is shown without a manual refresh

  Scenario: Creating the first program from the empty state replaces the empty state with the list
    Given no programs exist in the tenant
    When I click "Create Program" from the empty state
    And I create a program "I.G. First" with description "I.G. desc"
    Then the empty-state message disappears
    And the list shows exactly one row for "I.G. First"

  Scenario: An edit reflects in the list immediately (cross-cuts DS-2 AC2)
    Given a program "I.G. To Rename" exists
    When I rename it to "I.G. To Rename - Updated" via the edit modal
    Then the list shows "I.G. To Rename - Updated"
    And the old name is no longer visible

  Scenario: A delete removes the row from the list immediately (cross-cuts DS-4 AC1)
    Given a program "I.G. To Delete" exists
    When I delete and confirm
    Then the row for "I.G. To Delete" disappears without a manual refresh

  Scenario: List ordering is consistent across reloads
    Given programs "I.G. Order A", "I.G. Order B", and "I.G. Order C" exist
    When I capture the list order
    And I hard-reload the Programs page
    Then the list order matches the first capture

  Scenario: List does not include a deleted program
    Given a program "I.G. Deleted" exists
    When I delete and confirm
    And I navigate to Dashboard and back to Programs
    Then "I.G. Deleted" is still absent from the list

  # Negative

  Scenario: Server failure (5xx) when loading the list shows an error state, not empty
    Given I am logged in as admin
    And GET /api/programs returns HTTP 500
    When I navigate to the Programs page
    Then no program data rows are shown
    And the empty-state message is NOT shown
    And an error indication is visible

  Scenario: Slow / pending request shows a clear loading state, not a flash of empty state
    Given I am logged in as admin
    And GET /api/programs is delayed by 2 seconds
    When I navigate to the Programs page
    Then the empty-state message is NOT visible while the request is pending
    And the program table is visible after the response arrives

  Scenario: Unauthenticated access to /programs redirects to login
    Given I am not logged in
    When I navigate to /programs
    Then I see the Sign In form
    And the empty-state message is NOT shown

  Scenario: Non-admin user sees the appropriate restricted view
    Given I am logged in as a non-admin user
    When I navigate to the Programs page
    Then I see a read-only list or am redirected / denied (403)

  # Edge cases

  Scenario: Long names and descriptions are truncated or wrapped without breaking layout
    Given a program with a 255-character name exists
    And a program with a 1000-character description exists
    When I navigate to the Programs page
    Then both rows are visible with operable edit and delete controls
    And the table does not horizontally overflow

  Scenario: Unicode and special characters render correctly in name and description
    Given a program named "I.G. Renée's \"Accelerated\" Program" with description "I.G. Café & React <2026>" exists
    When I navigate to the Programs page
    Then the row shows the exact name and description as plain text
    And no HTML entities like "&amp;" or "&lt;" appear in the row

  Scenario: HTML-like text in name or description is rendered as plain text in the list (no XSS)
    Given a program named "I.G. <img src=x onerror=alert(1)>" with description "<script>alert(2)</script> I.G. xss list" exists
    When I navigate to the Programs page
    Then the row shows the values as plain text
    And no img or script elements are injected
    And no JavaScript alert is triggered

  Scenario: Programs with empty description display gracefully
    Given a program "I.G. NoDesc" exists with no description
    When I navigate to the Programs page
    Then the row shows the program name
    And edit and delete controls remain operable

  Scenario: Many programs (50+) render without performance regressions
    Given 50 or more programs exist
    When I navigate to the Programs page and scroll
    Then all rows render without excessive lag or missed indexes

  Scenario: List reflects rows created in a different session after re-fetch
    Given admin session B creates a program while session A is on another page
    When session A navigates back to Programs
    Then the newly created program appears in the list

# Ambiguities and gaps in acceptance criteria

# 1. Empty-state copy — AC2 references a "no programs yet" message; observed copy is
#    "No programs yet. Create your first program to get started." with a separate
#    "Create Program" CTA in addition to the header "+ New Program" button.
# 2. Empty-state trigger — AC2 implies zero programs; unclear whether empty state appears
#    only after a successful empty API response or also after deleting the last row.
# 3. API response shape — GET /api/programs returns `{ data: [...] }`, not a bare array;
#    route mocks must match this envelope.
# 4. Loading state — No AC defines loading UI while programs are being fetched.
# 5. Error UX — No AC for server failure (5xx) or network timeout on list load; inferred
#    from negative scenarios.
# 6. Role gating — User story says admin; non-admin list behavior is unspecified.
# 7. List ordering — No AC defines sort order (creation date, alphabetical, etc.).
# 8. Table vs card layout — AC1 implies tabular list; empty state uses a card/panel layout
#    without a `<table>` element.
# 9. Cross-session consistency — No AC for multi-admin concurrent list updates.
# 10. Performance — No AC for large list (50+) rendering.
