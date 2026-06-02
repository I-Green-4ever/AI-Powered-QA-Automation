import { resetTrackedPrograms } from './lib/program-tracker';

export default async function globalSetup(): Promise<void> {
  resetTrackedPrograms();
}
