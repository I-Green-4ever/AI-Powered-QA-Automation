import type { Locator, Page } from '@playwright/test';

export class ProgramDetailPanel {
  readonly selectProgramHint: Locator;
  readonly addSemesterButton: Locator;
  readonly manageCoursesButton: Locator;
  readonly generateCurriculumButton: Locator;
  readonly noSemestersHint: Locator;
  readonly semestersSubtitle: Locator;

  constructor(readonly page: Page) {
    this.selectProgramHint = page.getByText('Select a program to manage semesters');
    this.addSemesterButton = page.getByRole('button', { name: '+ Semester' });
    this.manageCoursesButton = page.getByRole('button', { name: 'Manage Courses' });
    this.generateCurriculumButton = page.getByRole('button', {
      name: /Generate Curriculum/,
    });
    this.noSemestersHint = page.getByText('No semesters yet');
    this.semestersSubtitle = page.getByText('Semesters & scheduling config');
  }

  heading(programName: string): Locator {
    return this.page.getByRole('heading', { name: programName, level: 4 });
  }
}
