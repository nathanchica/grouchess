## Project context

- See README.md for overall project context and structure if needed
- `pnpm` is used as the monorepo package manager

## Unit tests

- Unit tests are written using vitest.
- Each package has its own test suite, and tests are typically located in a `__tests__` directory near the code being tested.
- Test files follow the naming convention `*.test.ts`
- When creating test cases, try to consolidate similar tests with it.each using object-based tables (e.g. `it.each([{ scenario: ..., input: ..., expected: ... }, ...])`).
    - Avoid conditional expects e.g. if (...) { expect(...) } else { expect(...) }, split into separate test cases instead.
- Aim for 100% code coverage
- Use mocks and spies as needed to isolate units under test. The `vi.mock` and `vi.spyOn` APIs are available.
- Vi globals (e.g. `describe`, `it`, `expect`, `beforeEach`, `vi`) are available in test files without needing to import them.
- Mention any opportunities for splitting code into smaller, more testable functions or modules if applicable
- Export functions or constants if needed to facilitate testing
- One describe block per function being tested
- Backend tests HTTP routes using supertest, Express app is created via createApp() function from backend/src/app.ts
- Use mock data factories from `@grouchess/test-utils` where applicable.
    - See ./packages/test-utils/README.md for available factories and usage examples.
