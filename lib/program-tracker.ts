import fs from 'fs';
import path from 'path';
import type { Page } from '@playwright/test';

/** Append-only log of program IDs created during the run (one UUID per line). */
export const TRACK_FILE = path.join(
  __dirname,
  '..',
  'test-results',
  '.created-program-ids.jsonl'
);

const PROGRAMS_API = /\/api\/programs\/?$/;

/** Set SKIP_API_CLEANUP=1 to run tests without DELETE teardown (UI/debug). */
export function isApiCleanupSkipped(): boolean {
  const v = process.env.SKIP_API_CLEANUP?.toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export function resetTrackedPrograms(): void {
  fs.mkdirSync(path.dirname(TRACK_FILE), { recursive: true });
  fs.writeFileSync(TRACK_FILE, '');
}

/** IDs created in the current test (per-test API cleanup via cleanup.fixture). */
let currentTestProgramIds: string[] = [];

function appendProgramId(id: string): void {
  fs.mkdirSync(path.dirname(TRACK_FILE), { recursive: true });
  fs.appendFileSync(TRACK_FILE, `${id}\n`);
}

/** Register a program UUID for API cleanup after the test. */
export function trackProgram(id: string): void {
  appendProgramId(id);
  currentTestProgramIds.push(id);
}

export function clearCurrentTestPrograms(): void {
  currentTestProgramIds = [];
}

function removeProgramId(id: string): void {
  if (!fs.existsSync(TRACK_FILE)) return;
  const remaining = fs
    .readFileSync(TRACK_FILE, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && line !== id);
  fs.writeFileSync(
    TRACK_FILE,
    remaining.length ? `${remaining.join('\n')}\n` : ''
  );
}

export function readTrackedProgramIds(): string[] {
  if (!fs.existsSync(TRACK_FILE)) return [];
  const ids = fs
    .readFileSync(TRACK_FILE, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return [...new Set(ids)];
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
  const id = body.data?.id ?? body.id;
  if (typeof id !== 'string' || id.length === 0) {
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

  console.log(`[program-cleanup] Deleting ${ids.length} program(s) from test...`);
  const { deleted, alreadyGone, failed } = await deleteProgramIds(ids);
  console.log(
    `[program-cleanup] Test cleanup done. deleted=${deleted}, already_gone=${alreadyGone}, failed=${failed}`
  );
}

export async function deleteTrackedPrograms(): Promise<void> {
  if (isApiCleanupSkipped()) {
    console.log('[program-cleanup] Skipped (SKIP_API_CLEANUP is set).');
    return;
  }

  const ids = readTrackedProgramIds();
  if (ids.length === 0) {
    console.log('[program-cleanup] No programs to delete.');
    return;
  }

  console.log(
    `[program-cleanup] Deleting ${ids.length} program(s) created during tests...`
  );

  const { deleted, alreadyGone, failed } = await deleteProgramIds(ids);
  resetTrackedPrograms();
  console.log(
    `[program-cleanup] Done. deleted=${deleted}, already_gone=${alreadyGone}, failed=${failed}`
  );
}
