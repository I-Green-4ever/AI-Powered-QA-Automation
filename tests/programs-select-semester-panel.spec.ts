import { test, expect } from '../fixtures/cleanup.fixture';
import { createProgram } from './helpers/program';
import { ProgramsPage } from '../pages/programs.page';
import { format } from 'date-fns';

function uniqueSuffix(): string {
  const now = new Date();
  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  const ss = now.getSeconds().toString().padStart(2, '0');

  return `${format(now, 'dd/MMM/yyyy')} [${hh}:${mm}:${ss}]`;
}

test.describe('Programs — semester management panel', () => {
  test('TC-001 - Selecting a program reveals the semester management panel', async ({
    page,
  }) => {
    const programs = new ProgramsPage(page);
    const panel = programs.detailPanel;
    const programName = `I.G. Select Panel ${uniqueSuffix()}`;

    await createProgram(page, programName, 'I.G. semester panel precondition');

    await expect(panel.selectProgramHint).toBeVisible();
    await expect(panel.addSemesterButton).toHaveCount(0);

    await programs.programRow(programName).select();

    await expect(panel.selectProgramHint).toHaveCount(0);
    await expect(panel.heading(programName)).toBeVisible();
    await expect(panel.semestersSubtitle).toBeVisible();
    await expect(panel.noSemestersHint).toBeVisible();
    await expect(panel.manageCoursesButton).toBeVisible();
    await expect(panel.addSemesterButton).toBeVisible();
    await expect(panel.generateCurriculumButton).toBeDisabled();
  });
});
