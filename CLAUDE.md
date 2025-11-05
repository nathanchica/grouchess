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

### Frontend Testing

Guidelines from https://vitest.dev/guide/browser/component-testing.html

- Use vitest along with vitest-browser-react (browser mode) for testing React components
- For interactive elements, prefer `getByRole` queries to ensure accessibility compliance.
    - If components lack proper roles, consider suggesting improvements to enhance accessibility.
- Focus on behavior and user experience rather than implementation details
    - Test the contract of the component: inputs (props, context) and outputs (rendered UI, events)
    - Test user interactions (clicks, typing, etc.) and their effects on the component state and UI
        - Use `userEvent` and/or `page` from 'vitest/browser' for simulating user interactions

            ```ts
            // Testing stateful components and state transitions
            it('manages items correctly', async () => {
                const { getByText, getByTestId } = render(<ShoppingCart />)

                // Initially empty
                await expect.element(getByText('Your cart is empty')).toBeInTheDocument()

                // Add item
                await page.getByRole('button', { name: /add laptop/i }).click()

                // Verify state change
                await expect.element(getByText('1 item')).toBeInTheDocument()
                await expect.element(getByText('Laptop - $999')).toBeInTheDocument()

                // Test quantity updates
                await page.getByRole('button', { name: /increase quantity/i }).click()
                await expect.element(getByText('2 items')).toBeInTheDocument()
            })

            it('is accessible', async () => {
                const { getByRole, getByLabelText } = render(
                    <Modal isOpen={true} title="Settings">
                    <SettingsForm />
                    </Modal>
                )

                // Test focus management - modal should receive focus when opened
                // This is crucial for screen reader users to know a modal opened
                const modal = getByRole('dialog')
                await expect.element(modal).toHaveFocus()

                // Test ARIA attributes - these provide semantic information to screen readers
                await expect.element(modal).toHaveAttribute('aria-labelledby') // Links to title element
                await expect.element(modal).toHaveAttribute('aria-modal', 'true') // Indicates modal behavior

                // Test keyboard navigation - Escape key should close modal
                // This is required by ARIA authoring practices
                await userEvent.keyboard('{Escape}')
                // expect.element auto-retries until modal is removed
                await expect.element(modal).not.toBeInTheDocument()

                // Test focus trap - tab navigation should cycle within modal
                // This prevents users from tabbing to content behind the modal
                const firstInput = getByLabelText(/username/i)
                const lastButton = getByRole('button', { name: /save/i })

                // Use click to focus on the first input, then test tab navigation
                await firstInput.click()
                await userEvent.keyboard('{Shift>}{Tab}{/Shift}') // Shift+Tab goes backwards
                await expect.element(lastButton).toHaveFocus() // Should wrap to last element
            })
            ```

    - Test edge cases and error states
    - Avoid testing internal implementation details (e.g., internal state variables, CSS, etc.)

- There are mock context value factories available for common contexts used in the frontend
    - These can be found in the `__mocks__` directories next to the corresponding providers
    - To test components that depend on context, wrap them in the Provider with mock values
    - Context objects are exported from their respective provider files
    - example:

        ```ts
        import { PlayerChatSocketContext } from '../../../providers/PlayerChatSocketProvider';
        import { createMockPlayerChatSocketContextValues } from '../../../providers/__mocks__/PlayerChatSocketProvider';

        const renderPlayerChatPanel = ({ propOverrides = {}, contextOverrides = {} } = {}) => {
            const contextValue = createMockPlayerChatSocketContextValues(contextOverrides);
            return render(
                <PlayerChatSocketContext.Provider value={contextValue}>
                    <PlayerChatPanel {...defaultProps} {...propOverrides} />
                </PlayerChatSocketContext.Provider>
            );
        };

        // Usage in tests:
        it('sends message when Enter key is pressed', async () => {
            const sendStandardMessage = vi.fn();
            await renderPlayerChatPanel({
                contextOverrides: { sendStandardMessage }
            });
            // ... test implementation
        });
        ```

- Use meaningful test descriptions that explain the expected behavior, not implementation details:

    ```ts
    // Good: Describes user-facing behavior
    it('shows error message when email format is invalid');
    it('disables submit button while form is submitting');

    // Avoid: Implementation-focused descriptions
    it('calls validateEmail function');
    it('sets isSubmitting state to true');
    ```
