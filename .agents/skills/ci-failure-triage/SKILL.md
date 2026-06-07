---
name: ci-failure-triage
description: >-
  When a CI run is red, pull the run's logs and the playwright-report artifact via GitHub MCP or GH CLI,
  Read the Playwright error and trace, cross-reference the spec, POM, and app source in the repo,
  Analyse and classify real app bug vs test issue, and post a structured diagnosis to the PR.
  Use whenever a build fails - even if triage isn't asked for.
---

# CI Failure Triage

## Steps

1. Pull the failed run's logs + playwright-report artifact (GitHub MCP / gh CLI).
2. Read the Playwright error: failing test, expected vs received, trace path.
3. Cross-reference: the spec, the POM, and the Didaxis source in the repo.
4. Classify: real app bug (route to a Jira bug via 'jira-bug-reporter') vs test issue (propose a patch for human review).
5. Report:
   affected file, post root cause, expected/actual, suggested fix, and evidence (trace/screenshot + run id) as a PR comment.
   Story, total Failed, Test errors, Locator issues, App bugs, Infra/mocking

## Rules

- Never merge a fix automatically — propose, a human approves.
- For a real defect, reuse the jira-bug-reporter skill and link the story.
- The diagnosis must name the source location and cause, not just the symptom.
- Classify by test code errors, Test assertion / locator issues, Application bugs, Test infrastructure / mocking issues.
