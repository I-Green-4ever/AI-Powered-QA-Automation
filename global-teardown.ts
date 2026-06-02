import dotenv from 'dotenv';
import path from 'path';
import { deleteTrackedPrograms } from './lib/program-tracker';

dotenv.config({ path: path.resolve(__dirname, '.env') });

export default async function globalTeardown(): Promise<void> {
  await deleteTrackedPrograms();
}
