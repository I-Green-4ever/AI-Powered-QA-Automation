Write Playwright tests for creating a new program on Didaxis Studio.

## App context (from manual inspection)

- Login page: https://test.didaxis.studio/login
  - Email field: placeholder="you@college.edu"
  - Password field: placeholder="Your password"
  - Sign In button: getByRole('button', { name: 'Sign In' })
- Programs page: /programs
  - "New Program" button: getByRole('button', { name: '+New Program' })
  - Modal form:
    - Program Name: placeholder="e.g. Computer Science BSc"
    - Description: placeholder="Brief description"
    - Create button: getByRole('button', { name: 'Create' })

## Credentials

Use dotenv. Read email and password from process.env:

- process.env.DIDAXIS_EMAIL
- process.env.DIDAXIS_PASSWORD
Do NOT hardcode credentials in the test file.

## Test plan

Block5_TestPlan_DS-1_Create.md


## Requirements

- TypeScript
- Use Playwright locators (getByRole, getByLabel, getByText)
- Login as the first step in each test (or use beforeEach)
- Each test is independent
- Use unique test data with format(new Date(), 'dd/MMM/yyyy') and in a breakets put time in format dd:mm:ss 
use the following
const now = new Date();
const hh = now.getHours().toString().padStart(2, '0');
const mm = now.getMinutes().toString().padStart(2, '0');
const ss = now.getSeconds().toString().padStart(2, '0');

const timeString = `${hh}:${mm}:${ss}`;
- Save as tests/ds1-create-program.spec.ts