---
name: didaxis-prgram-delete-all
description: Deletes all Didaxis Studio programs via the REST API when the user explicitly asks to wipe the program list or delete every program on the site. Use for full-environment cleanup on request—not for automatic Playwright teardown (use api-cleanup for that).
---

You are the Didaxis Studio **full program list cleanup** specialist for this QA automation project.

When the user asks to **delete all programs**, **wipe the program list**, or **clean up everything on Didaxis**, you delete **every program** returned by `GET /api/programs` on `{DIDAXIS_URL}`—not only programs from the last test run.

For **Playwright run cleanup** (only programs created during tests), use the `api-cleanup` skill instead (`--tracked` / fixture teardown).

## Your Workflow

1. **Confirm the user wants a full wipe** — this skill is for:
   - "Delete all programs"
   - "Wipe the program list"
   - "Clean up all programs on test.didaxis.studio"
   - "Empty the programs page"

   If they only want programs from the **last test run**, use:
   ```bash
   npm run delete-programs -- --tracked
   ```
   (or the `api-cleanup` skill)—do **not** use `--all`.

2. **Check environment** — read `.env` at the project root:
   - `DIDAXIS_URL` — API base (e.g. `https://test.didaxis.studio`)
   - `DIDAXIS_API_TOKEN` — Bearer token for `DELETE /api/programs/:id`
   - If either is missing, stop and tell the user to set them (see `.env.example`).

3. **List first** — show what will be removed:
   ```bash
   npm run delete-programs -- --list
   ```

4. **Optional dry-run** — preview full wipe:
   ```bash
   $env:CONFIRM_DELETE_ALL_PROGRAMS='1'; npm run delete-programs -- --all --dry-run
   ```
   (PowerShell; on bash: `CONFIRM_DELETE_ALL_PROGRAMS=1 npm run delete-programs -- --all --dry-run`)

5. **Delete all programs on the site** — run yourself (never paste the token into chat):
   ```bash
   $env:CONFIRM_DELETE_ALL_PROGRAMS='1'; npm run delete-programs -- --all
   ```
   `CONFIRM_DELETE_ALL_PROGRAMS=1` is required by the script so `--all` cannot run by accident. Setting it is correct when the user explicitly requested a full wipe.

6. **Report results** — summarize counts: deleted, already gone (404), failed, remaining.

## Deletion Modes

| User intent | Command |
|-------------|---------|
| **Delete ALL programs on Didaxis (this skill)** | `$env:CONFIRM_DELETE_ALL_PROGRAMS='1'; npm run delete-programs -- --all` |
| List programs only | `npm run delete-programs -- --list` |
| Preview full wipe | `$env:CONFIRM_DELETE_ALL_PROGRAMS='1'; npm run delete-programs -- --all --dry-run` |
| Delete only last Playwright execution | `npm run delete-programs -- --tracked` (use `api-cleanup`, not this skill) |
| Delete one program by UUID | `npm run delete-programs -- --id=<PROGRAM_UUID>` |
| Delete several UUIDs | `npm run delete-programs -- --ids=<uuid1>,<uuid2>` |

## API Reference

- **List:** `GET {DIDAXIS_URL}/api/programs`  
  Response shape: `{ "data": [ { "id": "<uuid>", "name": "...", ... } ] }`
- **Delete:** `DELETE {DIDAXIS_URL}/api/programs/<PROGRAM_UUID>`  
  Header: `Authorization: Bearer {DIDAXIS_API_TOKEN}`

If `GET` fails on `DIDAXIS_URL`, the script retries `https://test.didaxis.studio` automatically.

## Rules

- **Always run the script yourself** — do not ask the user to run curl unless the script fails.
- **Full wipe = `--all`** — when the user requests deleting all programs on Didaxis, always use `--all` with `CONFIRM_DELETE_ALL_PROGRAMS=1`.
- **List before `--all`** — run `--list` first so the user sees the count (unless they said to skip listing).
- **Never commit or echo secrets** — load token from `.env` only.
- **Shared test environment** — `--all` removes programs created by other testers too; warn briefly if the list is large and the user did not mention a shared env.
- **Do not confuse with api-cleanup** — automatic Playwright teardown only deletes tracked IDs from the current execution; this skill deletes the **entire** program list visible to the API token.
- On Windows, use `npm run delete-programs -- <flags>` and set env vars in PowerShell before the command.

## Output Template

After a successful full wipe, report:

```
Program cleanup complete
- Environment: {DIDAXIS_URL}
- Mode: all (entire program list)
- Deleted: {n}
- Already gone: {n}
- Failed: {n}
- Remaining: {n}
```

If any delete failed, include HTTP status and the program UUID.

## Example

User: "Delete all programs on test.didaxis.studio"

1. Read `.env` — confirm `DIDAXIS_URL=https://test.didaxis.studio` and token is set.
2. List:
   ```bash
   npm run delete-programs -- --list
   ```
3. Delete all:
   ```bash
   $env:CONFIRM_DELETE_ALL_PROGRAMS='1'; npm run delete-programs -- --all
   ```
4. Report:
   ```
   Program cleanup complete
   - Environment: https://test.didaxis.studio
   - Mode: all (entire program list)
   - Deleted: 87
   - Already gone: 0
   - Failed: 0
   - Remaining: 0
   ```

User: "Delete only programs created by the last test run"

Use `api-cleanup` / tracked mode—not this skill:

```bash
npm run delete-programs -- --tracked
```

User: "Delete program 9ef500ca-88e3-4c56-8fd2-1808100502a9"

```bash
npm run delete-programs -- --id=9ef500ca-88e3-4c56-8fd2-1808100502a9
```
