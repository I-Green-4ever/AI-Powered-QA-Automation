import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { Page } from '@playwright/test';

const TEST_RESULTS_DIR = path.join(__dirname, '..', 'test-results');

/** Append-only log of program IDs created during the current execution (one per line). */
export const TRACK_FILE = path.join(
  TEST_RESULTS_DIR,
  '.created-program-ids.jsonl'
);

/** Marks which Playwright run owns rows in TRACK_FILE. */
export const EXECUTION_MANIFEST = path.join(
  TEST_RESULTS_DIR,
  '.execution-manifest.json'
);

const PROGRAMS_API = /\/api\/programs\/?$/;

export type ExecutionManifest = {
  runId: string;
  startedAt: string;
};

/** Set SKIP_API_CLEANUP=1 to run tests without DELETE teardown (UI/debug). */
export function isApiCleanupSkipped(): boolean {
  const v = process.env.SKIP_API_CLEANUP?.toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function ensureTestResultsDir(): void {
  fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
}

export function readExecutionManifest(): ExecutionManifest | null {
  if (!fs.existsSync(EXECUTION_MANIFEST)) return null;
  try {
    return JSON.parse(
      fs.readFileSync(EXECUTION_MANIFEST, 'utf8')
    ) as ExecutionManifest;
  } catch {
    return null;
  }
}

/** Start a new Playwright execution scope (call from global-setup). */
export function startExecution(): ExecutionManifest {
  ensureTestResultsDir();
  const manifest: ExecutionManifest = {
    runId: randomUUID(),
    startedAt: new Date().toISOString(),
  };
  fs.writeFileSync(EXECUTION_MANIFEST, `${JSON.stringify(manifest)}\n`);
  fs.writeFileSync(TRACK_FILE, '');
  return manifest;
}

/** @deprecated Use startExecution() — kept for callers that only clear the track file. */
export function resetTrackedPrograms(): void {
  if (!readExecutionManifest()) {
    startExecution();
    return;
  }
  fs.writeFileSync(TRACK_FILE, '');
}

function parseTrackLine(line: string): { runId: string; programId: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const sep = trimmed.indexOf('|');
  if (sep === -1) {
    // Legacy line (no run scope) — ignore so we never delete out-of-scope IDs.
    return null;
  }
  const runId = trimmed.slice(0, sep);
  const programId = trimmed.slice(sep + 1);
  if (!runId || !programId) return null;
  return { runId, programId };
}

function appendProgramId(programId: string): void {
  const manifest = readExecutionManifest();
  if (!manifest) {
    throw new Error(
      'No execution manifest. global-setup must call startExecution() before tests run.'
    );
  }
  ensureTestResultsDir();
  fs.appendFileSync(TRACK_FILE, `${manifest.runId}|${programId}\n`);
}

/** IDs created in the current test (per-test API cleanup via cleanup.fixture). */
let currentTestProgramIds: string[] = [];

/** Register a program UUID for API cleanup after the test (current execution only). */
export function trackProgram(id: string): void {
  appendProgramId(id);
  currentTestProgramIds.push(id);
}

export function clearCurrentTestPrograms(): void {
  currentTestProgramIds = [];
}

function removeProgramId(id: string): void {
  const manifest = readExecutionManifest();
  if (!fs.existsSync(TRACK_FILE) || !manifest) return;

  const remaining = fs
    .readFileSync(TRACK_FILE, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      const parsed = parseTrackLine(line);
      if (!parsed) return false;
      return !(parsed.runId === manifest.runId && parsed.programId === id);
    });

  fs.writeFileSync(
    TRACK_FILE,
    remaining.length ? `${remaining.join('\n')}\n` : ''
  );
}

/** Program IDs created during the current Playwright execution only. */
export function readTrackedProgramIds(): string[] {
  const manifest = readExecutionManifest();
  if (!manifest || !fs.existsSync(TRACK_FILE)) return [];

  const ids = fs
    .readFileSync(TRACK_FILE, 'utf8')
    .split('\n')
    .map((line) => parseTrackLine(line))
    .filter(
      (parsed): parsed is { runId: string; programId: string } =>
        parsed !== null && parsed.runId === manifest.runId
    )
    .map((parsed) => parsed.programId);

  return [...new Set(ids)];
}

function parseProgramIdFromCreateBody(body: {
  data?: { id?: string };
  id?: string;
}): string | null {
  const id = body.data?.id ?? body.id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/**
 * Track every successful POST /api/programs on this page (e.g. double-click
 * duplicates). Installed automatically by fixtures/cleanup.fixture.ts.
 */
export function attachProgramCreateAutoTracker(page: Page): void {
  if (isApiCleanupSkipped()) return;

  page.on('response', (response) => {
    void (async () => {
      try {
        const req = response.request();
        if (req.method() !== 'POST' || !response.ok()) return;
        if (!PROGRAMS_API.test(new URL(response.url()).pathname)) return;

        const body = JSON.parse(await response.text()) as {
          data?: { id?: string };
          id?: string;
        };
        const id = parseProgramIdFromCreateBody(body);
        if (id) trackProgram(id);
      } catch {
        // Ignore parse errors; explicit waitForProgramCreate may still throw.
      }
    })();
  });
}

/**
 * Wait for a successful POST /api/programs and track the new program ID.
 * Call before clicking Create.
 */
export async function waitForProgramCreate(page: Page): Promise<string> {
  const response = await page.waitForResponse((r) => {
    if (!r.ok()) return false;
    if (r.request().method() !== 'POST') return false;
    return PROGRAMS_API.test(new URL(r.url()).pathname);
  });

  const body = JSON.parse(await response.text()) as {
    data?: { id?: string };
    id?: string;
  };
  const id = parseProgramIdFromCreateBody(body);
  if (!id) {
    throw new Error('POST /api/programs response missing program id');
  }
  trackProgram(id);
  return id;
}

/** Drop a tracked ID when the test deletes it during the run (avoids redundant DELETE). */
export function untrackProgram(id: string): void {
  removeProgramId(id);
  currentTestProgramIds = currentTestProgramIds.filter((x) => x !== id);
}

function apiBaseUrl(): string {
  const raw = process.env.DIDAXIS_URL;
  if (!raw) {
    throw new Error(
      'Missing DIDAXIS_URL. Set it in the .env file at the project root.'
    );
  }
  return raw.replace(/\/$/, '');
}

function requireApiToken(): string {
  const token = process.env.DIDAXIS_API_TOKEN;
  if (!token) {
    throw new Error(
      'Missing DIDAXIS_API_TOKEN. Set it in the .env file at the project root.'
    );
  }
  return token;
}

export async function deleteProgramIds(
  ids: string[]
): Promise<{ deleted: number; alreadyGone: number; failed: number }> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) {
    return { deleted: 0, alreadyGone: 0, failed: 0 };
  }

  const baseUrl = apiBaseUrl();
  const token = requireApiToken();

  let deleted = 0;
  let alreadyGone = 0;
  let failed = 0;

  for (const id of unique) {
    const res = await fetch(`${baseUrl}/api/programs/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      deleted++;
      removeProgramId(id);
    } else if (res.status === 404) {
      alreadyGone++;
      removeProgramId(id);
    } else {
      failed++;
      const body = await res.text().catch(() => '');
      console.warn(
        `[program-cleanup] Failed to delete ${id}: HTTP ${res.status} ${body}`
      );
    }
  }

  return { deleted, alreadyGone, failed };
}

/** Per-test cleanup invoked by fixtures/cleanup.fixture.ts after each test. */
export async function deleteProgramsForCurrentTest(): Promise<void> {
  if (isApiCleanupSkipped()) {
    currentTestProgramIds = [];
    return;
  }

  const ids = [...new Set(currentTestProgramIds)];
  currentTestProgramIds = [];
  if (ids.length === 0) return;

  const manifest = readExecutionManifest();
  console.log(
    `[program-cleanup] Deleting ${ids.length} program(s) from test (run ${manifest?.runId ?? 'unknown'})...`
  );
  const { deleted, alreadyGone, failed } = await deleteProgramIds(ids);
  console.log(
    `[program-cleanup] Test cleanup done. deleted=${deleted}, already_gone=${alreadyGone}, failed=${failed}`
  );
}

/** Delete programs tracked for the current Playwright execution only. */
export async function deleteTrackedPrograms(): Promise<void> {
  if (isApiCleanupSkipped()) {
    console.log('[program-cleanup] Skipped (SKIP_API_CLEANUP is set).');
    return;
  }

  const manifest = readExecutionManifest();
  const ids = readTrackedProgramIds();
  if (ids.length === 0) {
    console.log('[program-cleanup] No programs to delete for this execution.');
    return;
  }

  console.log(
    `[program-cleanup] Deleting ${ids.length} program(s) for execution ${manifest?.runId ?? 'unknown'}...`
  );

  const { deleted, alreadyGone, failed } = await deleteProgramIds(ids);
  fs.writeFileSync(TRACK_FILE, '');
  console.log(
    `[program-cleanup] Execution cleanup done. deleted=${deleted}, already_gone=${alreadyGone}, failed=${failed}`
  );
}
