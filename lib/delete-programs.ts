import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import {
  deleteTrackedPrograms,
  readTrackedProgramIds,
} from './program-tracker';

export type ProgramSummary = {
  id: string;
  name: string;
};

export type DeleteMode = 'all' | 'tracked' | 'ids' | 'execution';

export type DeleteResult = {
  deleted: number;
  alreadyGone: number;
  failed: number;
  failures: Array<{ id: string; status: number; body: string }>;
};

const FALLBACK_BASE_URL = 'https://test.didaxis.studio';

function resolveBaseUrl(): string {
  const raw = process.env.DIDAXIS_URL;
  if (!raw) {
    throw new Error(
      'Missing DIDAXIS_URL. Set it in the .env file at the project root.'
    );
  }
  return raw.replace(/\/$/, '');
}

function resolveApiToken(): string {
  const token = process.env.DIDAXIS_API_TOKEN;
  if (!token) {
    throw new Error(
      'Missing DIDAXIS_API_TOKEN. Set it in the .env file at the project root.'
    );
  }
  return token;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

async function fetchPrograms(baseUrl: string, token: string): Promise<ProgramSummary[]> {
  const res = await fetch(`${baseUrl}/api/programs`, {
    headers: authHeaders(token),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GET /api/programs failed: HTTP ${res.status} ${body}`);
  }

  const json = (await res.json()) as {
    data?: Array<{ id?: string; name?: string }>;
  };

  return (json.data ?? [])
    .filter((p): p is { id: string; name: string } => Boolean(p.id))
    .map((p) => ({ id: p.id, name: p.name ?? '(unnamed)' }));
}

export async function listPrograms(baseUrl = resolveBaseUrl()): Promise<ProgramSummary[]> {
  const token = resolveApiToken();
  try {
    return await fetchPrograms(baseUrl, token);
  } catch (err) {
    if (baseUrl === FALLBACK_BASE_URL) {
      throw err;
    }
    console.warn(
      `[program-cleanup] Primary URL failed (${baseUrl}). Retrying ${FALLBACK_BASE_URL}...`
    );
    return fetchPrograms(FALLBACK_BASE_URL, token);
  }
}

async function deleteByIds(
  ids: string[],
  baseUrl = resolveBaseUrl()
): Promise<DeleteResult> {
  const token = resolveApiToken();
  const result: DeleteResult = {
    deleted: 0,
    alreadyGone: 0,
    failed: 0,
    failures: [],
  };

  for (const id of ids) {
    const res = await fetch(`${baseUrl}/api/programs/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    });

    if (res.ok) {
      result.deleted++;
    } else if (res.status === 404) {
      result.alreadyGone++;
    } else {
      result.failed++;
      const body = await res.text().catch(() => '');
      result.failures.push({ id, status: res.status, body });
    }
  }

  return result;
}

export async function deletePrograms(options: {
  mode: DeleteMode;
  ids?: string[];
  dryRun?: boolean;
}): Promise<{ programs: ProgramSummary[]; result?: DeleteResult }> {
  const { mode, ids = [], dryRun = false } = options;

  if (mode === 'tracked' || mode === 'execution') {
    const trackedIds = readTrackedProgramIds();
    if (trackedIds.length === 0) {
      console.log(
        '[program-cleanup] No programs tracked for the current execution.'
      );
      return { programs: [] };
    }

    const programs = trackedIds.map((id) => ({ id, name: '(this execution)' }));
    if (dryRun) {
      console.log(
        `[program-cleanup] Dry run: would delete ${programs.length} program(s) from this execution.`
      );
      for (const p of programs) {
        console.log(`  - ${p.id}`);
      }
      return { programs };
    }

    await deleteTrackedPrograms();
    return {
      programs,
      result: { deleted: programs.length, alreadyGone: 0, failed: 0, failures: [] },
    };
  }

  if (mode === 'all') {
    requireDeleteAllConfirmation();
  }

  const programs =
    mode === 'ids'
      ? ids.map((id) => ({ id, name: '(requested)' }))
      : await listPrograms();

  if (programs.length === 0) {
    console.log('[program-cleanup] No programs to delete.');
    return { programs: [] };
  }

  if (dryRun) {
    console.log(`[program-cleanup] Dry run: would delete ${programs.length} program(s).`);
    for (const p of programs) {
      console.log(`  - ${p.id}  ${p.name.slice(0, 80)}`);
    }
    return { programs };
  }

  console.log(`[program-cleanup] Deleting ${programs.length} program(s)...`);
  const result = await deleteByIds(programs.map((p) => p.id));

  for (const failure of result.failures) {
    console.warn(
      `[program-cleanup] Failed to delete ${failure.id}: HTTP ${failure.status} ${failure.body}`
    );
  }

  console.log(
    `[program-cleanup] Done. deleted=${result.deleted}, already_gone=${result.alreadyGone}, failed=${result.failed}`
  );

  const remaining = await listPrograms().catch(() => []);
  console.log(`[program-cleanup] Remaining programs: ${remaining.length}`);

  return { programs, result };
}

function requireDeleteAllConfirmation(): void {
  const v = process.env.CONFIRM_DELETE_ALL_PROGRAMS?.toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes') return;
  throw new Error(
    '--all deletes every program visible to your API token (entire test environment). ' +
      'Use --tracked to delete only programs from your last Playwright execution, ' +
      'or set CONFIRM_DELETE_ALL_PROGRAMS=1 to confirm --all.'
  );
}

function parseArgs(argv: string[]): {
  mode: DeleteMode;
  ids: string[];
  dryRun: boolean;
  listOnly: boolean;
} {
  let mode: DeleteMode = 'tracked';
  const ids: string[] = [];
  let dryRun = false;
  let listOnly = false;

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--list') {
      listOnly = true;
    } else if (arg === '--tracked' || arg === '--execution') {
      mode = 'tracked';
    } else if (arg === '--all') {
      mode = 'all';
    } else if (arg.startsWith('--id=')) {
      mode = 'ids';
      ids.push(arg.slice('--id='.length));
    } else if (arg.startsWith('--ids=')) {
      mode = 'ids';
      ids.push(...arg.slice('--ids='.length).split(',').map((s) => s.trim()).filter(Boolean));
    }
  }

  if (mode === 'ids' && ids.length === 0) {
    throw new Error('Mode --id or --ids requires at least one program UUID.');
  }

  return { mode, ids, dryRun, listOnly };
}

async function main(): Promise<void> {
  const { mode, ids, dryRun, listOnly } = parseArgs(process.argv.slice(2));

  if (listOnly) {
    const programs = await listPrograms();
    console.log(`[program-cleanup] Found ${programs.length} program(s):`);
    for (const p of programs) {
      console.log(`  ${p.id}  ${p.name}`);
    }
    return;
  }

  await deletePrograms({ mode, ids, dryRun });
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[program-cleanup]', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
