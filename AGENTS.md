## Project context

- See README.md for overall project context and structure if needed
- `pnpm` is used as the monorepo package manager
- See packages/models/README.md for common schemas and types

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
- Use meaningful test descriptions that explain the expected behavior, not implementation details:

    ```ts
    // Good: Describes user-facing behavior
    it('shows error message when email format is invalid');
    it('disables submit button while form is submitting');

    // Avoid: Implementation-focused descriptions
    it('calls validateEmail function');
    it('sets isSubmitting state to true');
    ```

- See ChallengerWaitingRoom.test.tsx for an example of well-structured frontend test cases and mocks.

#### Locating elements

- For interactive elements, prefer `getByRole` queries to ensure accessibility compliance.
    - If components lack proper roles, consider suggesting improvements to enhance accessibility.
- For images, use `getByRole('img', { name: /alt text/i })` to select by alt text
    - For multiple images, use `getByRole('img', { name: /alt text/i }).elements()` to get all matching elements

        ```ts
        const { getByRole } = render(<MyComponent />);
        const images = await getByRole('img', { name: /alt text/i }).elements();
        expect(images.length).toBe(2);
        expect(images[0]).toHaveAttribute('alt', 'First image alt text');
        expect(images[1]).toHaveAttribute('alt', 'Second image alt text');
        ```

- Avoid using query selectors like container.querySelector to find elements. Only use:
    - getByRole
        - Can use { includeHidden: true } option to include hidden elements
    - getByLabelText
    - getByText
    - getByTestId
    - getByPlaceholder
    - If unavoidable, suggest improvements to add proper roles or labels instead

#### Asserting visibility and behavior

- Assert with toBeVisible() when checking visibility of elements instead of checking CSS/tailwind classes
- Focus on behavior and user experience rather than implementation details
    - Test the contract of the component: inputs (props, context) and outputs (rendered UI, events)
    - Test user interactions (clicks, typing, etc.) and their effects on the component state and UI
        - Use `userEvent` and/or `page` from 'vitest/browser' for simulating user interactions

            ```ts
            import { render } from 'vitest-browser-react';
            import { page, userEvent } from 'vitest/browser';

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
    - Avoid testing internal implementation details (e.g., internal state variables, CSS, tailwind classes, etc.)

#### Mocking strategies

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

- Use `vi.stubEnv` to mock environment variables when needed

    ```ts
    it("throws error if API base URL is not configured", async () => {
        vi.stubEnv('VITE_API_BASE_URL', undefined);
        await expect(render(<ChallengerWaitingRoom {...defaultProps} />)).rejects.toThrow('Room endpoint is not configured.');
        vi.unstubAllEnvs();
    });
    ```

- Mocking fetches:

    ```ts
    import type { Mock } from 'vitest';

    let fetchSpy: Mock<typeof fetch>;

    const mockGetGameRoomBasicInfoParsedResponse: GetGameRoomBasicInfoResponse = {
        roomId: 'test-room-123',
        timeControl: createMockTimeControl(),
    };

    type CreateFetchResponseArgs = {
        data?: GetGameRoomBasicInfoResponse | null;
        ok?: boolean;
    };

    function createFetchResponse({ data = mockGetGameRoomBasicInfoParsedResponse, ok = true }: CreateFetchResponseArgs = {}): Response {
        return {
            ok,
            json: vi.fn().mockResolvedValue(data),
        } as unknown as Response;
    }


    it('fetches data successfully', async () => {
        fetchSpy.mockResolvedValueOnce(createFetchResponse());

        // ...test implementation
    });

    it("throws error if fetch fails", async () => {
        vi.spyOn(window, 'fetch').mockResolvedValueOnce(createFetchResponse({ ok: false }));
        await expect(render(<ChallengerWaitingRoom {...defaultProps} />)).rejects.toThrow('Failed to fetch room info.');
    });
    ```

- Mocking modules in react tests:

    ```ts
    import * as useJoinGameRoomModule from '../../../hooks/useJoinGameRoom';

    // Browser mode limitation: https://vitest.dev/guide/browser/#spying-on-module-exports
    vi.mock('../../../hooks/useJoinGameRoom', { spy: true });

    it('joins the game room on button click', async () => {
        vi.spyOn(useJoinGameRoomModule, 'useJoinGameRoom').mockReturnValue({
            joinGameRoom: vi.fn().mockImplementation(({ onSuccess }) => {
                onSuccess({
                    roomId,
                    playerId,
                    token,
                });
            }),
            loading: false,
            error: null,
        });

        // ...test implementation
    });
    ```
