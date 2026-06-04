import { startExecution } from './lib/program-tracker';

export default async function globalSetup(): Promise<void> {
  const manifest = startExecution();
  console.log(`[program-cleanup] Execution started: ${manifest.runId}`);
}
