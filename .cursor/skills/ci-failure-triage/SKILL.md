---
name: ci-failure-triage
description: >-
  When a CI run is red, pull the run's logs and the playwright-report artifact via GitHub MCP or GH CLI,
  Read the Playwright error and trace, cross-reference the spec, POM, and app source in the repo,
  Analyse and classify real app bug vs test issue, post a structured diagnosis to the PR,
  and save the full report to Reports/analysis/ci-triage-run-<run-id>.md.
  Use whenever a build fails - even if triage isn't asked for.
---

# CI Failure Triage

## Steps

1. Pull the failed run's logs + playwright-report artifact (GitHub MCP / gh CLI).
2. Read the Playwright error: failing test, expected vs received, trace path.
3. Cross-reference: the spec, the POM, and the Didaxis source in the repo.
4. Classify: real app bug (route to a Jira bug via `jira-bug-reporter`) vs test issue (propose a patch for human review).
5. Report:
   - Post a PR comment when the run is tied to an open PR.
   - Always save the full diagnosis to `Reports/analysis/` (see Output).

## Rules

- Never merge a fix automatically — propose; a human approves.
- For a real defect, reuse the `jira-bug-reporter` skill and link the story.
- The diagnosis must name the source location and cause, not just the symptom.
- Classify by: test code errors, test assertion / locator issues, application bugs, test infrastructure / mocking issues.
- Always write the local report file, even when a PR comment is posted.

## Output

Create `Reports/analysis/` if missing.

**Filename:** `Reports/analysis/ci-triage-run-<run-id>.md`  
**Example:** `Reports/analysis/ci-triage-run-27082666531.md`

Download the Playwright HTML report artifact under `Reports/` when possible:

- Local test runs: `Reports/playwright-report/`
- CI artifact download: `Reports/playwright-report-<run-id>/`

Example: `gh run download <run-id> -n playwright-report -D Reports/playwright-report-<run-id>`

### Report structure

1. **Header** — run URL, commit, branch, result counts, report folder path
2. **Summary by Story** — Story | Total Failed | Test Errors | Locator Issues | App Bugs | Infra/Mocking
3. **Per-Failure Diagnosis** — by story; each failure: affected file, classification, root cause, expected/actual, suggested fix, evidence
4. **Proposed Patches (Human Review — Do Not Auto-Merge)**
5. **Jira Candidates** — use `jira-bug-reporter` for application bugs
6. **Priority Recommendations**
7. **Related Artifacts** — report, CI logs command, `Reports/bugs/`

### PR vs local file

| Situation | Action |
|-----------|--------|
| Run from an open PR | PR comment + save `Reports/analysis/ci-triage-run-<run-id>.md` |
| Push to `master` / no PR | Save file only; tell the user the path |
