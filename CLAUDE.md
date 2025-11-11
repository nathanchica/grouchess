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
- Running tests:
    - From the monorepo root: `pnpm test <package-name>` (e.g. `pnpm test frontend`)
    - From within a package: `pnpm test`
    - To run a specific test file: `pnpm test <test-file-name>` (e.g. `pnpm test GameRoomForm.test.ts`)
    - Without coverage: `pnpm test:run <test-file-name>` (e.g. `pnpm test:run GameRoomForm.test.ts`)

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
- Test case structure:

    ```ts
    describe('ComponentName', () => {
        // Setup and common utilities

        describe('Specific feature or prop', () => {
            it('changes title text when button is clicked', async () => {
                // Setup: setup component with props, context, mocks
                const { getByRole } = await renderComponentName({
                    propOverrides: { ... },
                    contextOverrides: { ... },
                });

                // Locate relevant elements
                const button = getByRole('button', { name: /submit/i });
                const title = getByRole('heading', { name: /title/i });

                // Actions and assertions
                await expect.element(title).toHaveTextContent('Original Title');
                await expect.element(button).toBeEnabled();

                await button.click();
                await expect.element(title).toHaveTextContent('Changed Title');
            });

            // More test cases...
        });

        // More describe blocks for other features or props...
    });
    ```

#### Locating elements

- Avoid using query selectors like container.querySelector to find elements. Only use:
    - getByRole
        - Can use { includeHidden: true } option to include hidden elements
    - getByLabelText
    - getByText
    - getByTestId
    - getByPlaceholder
    - If unavoidable, suggest improvements to add proper roles or labels instead
- For images, use `getByRole('img', { name: /alt text/i })` to select by alt text
    - For multiple images, use `getByRole('img').elements()` to get all matching elements

        ```ts
        const { getByRole } = await render(<MyComponent />);
        const images = await getByRole('img').elements();
        expect(images.length).toBe(2);
        expect(images[0]).toHaveAttribute('alt', 'First image alt text');
        expect(images[1]).toHaveAttribute('alt', 'Second image alt text');
        ```

- Locate elements and store them in variables before performing actions or assertions
    - This improves readability and avoids repeating queries

        ```ts
        const { getByRole } = await render(<MyComponent />);
        const submitButton = getByRole('button', { name: /submit/i });

        // Perform actions
        await submitButton.click();

        // Assertions
        await expect.element(submitButton).toBeDisabled();
        ```

- Locating children within a specific parent element:

    ```ts
    const { getByTestId } = await render(<MyComponent />);
    const parentElement = getByTestId('parent-element');

    // Locate child button within the parent element
    const childButton = parentElement.getByRole('button', { name: /child button/i });

    // Perform actions or assertions on the child button
    await childButton.click();
    await expect.element(childButton).toBeDisabled();
    ```

#### Asserting visibility and behavior

- Assert with toBeVisible() when checking visibility of elements instead of checking CSS or tailwind classes
- Focus on behavior and user experience rather than implementation details
    - Test the contract of the component: inputs (props, context) and outputs (rendered UI, events)
    - Test user interactions (clicks, typing, etc.) and their effects on the component state and UI
        - Use `userEvent` from 'vitest/browser' for simulating user interactions. Events like `click` can also be called
          directly on locators

            ```ts
            import { render } from 'vitest-browser-react';
            import { userEvent } from 'vitest/browser';

            const validFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
            const invalidFEN = 'invalid-fen-string';

            it('accepts valid FEN strings and enables Load button', async () => {
                vi.spyOn(chessModule, 'isValidFEN').mockReturnValue(true);
                const { getByLabelText, getByRole, getByText } = await renderLoadBoardView();

                const fenInput = getByLabelText(/FEN/i);
                await userEvent.fill(fenInput, validFEN);

                const errorText = getByRole('alert');
                await expect.element(errorText).not.toBeInTheDocument();

                const loadButton = getByRole('button', { name: /load/i });
                await expect.element(loadButton).toBeEnabled();
            });

            it('shows error for invalid FEN strings and disables Load button', async () => {
                vi.spyOn(chessModule, 'isValidFEN').mockReturnValue(false);
                const { getByLabelText, getByRole, getByText } = await renderLoadBoardView();

                const fenInput = getByLabelText(/FEN/i);
                await userEvent.fill(fenInput, invalidFEN);

                const errorText = getByRole('alert');
                await expect.element(errorText).toBeInTheDocument();
                expect(errorText).toHaveTextContent('Invalid FEN');

                const loadButton = getByRole('button', { name: /load/i });
                await expect.element(loadButton).toBeDisabled();
            });

            it('clears error when input is emptied', async () => {
                vi.spyOn(chessModule, 'isValidFEN').mockReturnValue(false);
                const { getByLabelText, getByText } = await renderLoadBoardView();

                const fenInput = getByLabelText(/FEN/i);

                await userEvent.fill(fenInput, invalidFEN);

                const errorText = getByRole('alert');
                await expect.element(errorText).toBeInTheDocument();

                await userEvent.clear(fenInput);

                await expect.element(errorText).not.toBeInTheDocument();
            });

            it('validates on every character change', async () => {
                const isValidFENSpy = vi.spyOn(chessModule, 'isValidFEN').mockReturnValue(false);
                const { getByLabelText } = await renderLoadBoardView();

                const fenInput = getByLabelText(/FEN/i);

                // Type character by character
                await userEvent.type(fenInput, 'abc');

                // isValidFEN should be called for each character typed (3 times)
                expect(isValidFENSpy).toHaveBeenCalledTimes(3);
            });

            it('submits form via Enter key', async () => {
                vi.spyOn(chessModule, 'isValidFEN').mockReturnValue(true);
                const loadFEN = vi.fn();
                const onDismiss = vi.fn();
                const { getByLabelText } = await renderLoadBoardView({
                    propOverrides: { onDismiss },
                    contextOverrides: { loadFEN },
                });

                const fenInput = getByLabelText(/FEN/i);
                await userEvent.fill(fenInput, validFEN);

                // Press Enter to submit
                await userEvent.keyboard('{Enter}');

                expect(loadFEN).toHaveBeenCalledWith(validFEN);
                expect(onDismiss).toHaveBeenCalled();
            });

            it('prevents submission with invalid FEN', async () => {
                vi.spyOn(chessModule, 'isValidFEN').mockReturnValue(false);
                const loadFEN = vi.fn();
                const onDismiss = vi.fn();
                const { getByLabelText, getByRole } = await renderLoadBoardView({
                    propOverrides: { onDismiss },
                    contextOverrides: { loadFEN },
                });

                const fenInput = getByLabelText(/FEN/i);
                await userEvent.fill(fenInput, invalidFEN);

                // Button should be disabled with invalid FEN
                const loadButton = getByRole('button', { name: /load/i });
                await expect.element(loadButton).toBeDisabled();

                // Try to submit via Enter key (should do nothing)
                await userEvent.keyboard('{Enter}');

                expect(loadFEN).not.toHaveBeenCalled();
                expect(onDismiss).not.toHaveBeenCalled();
            });

            it('keyboard navigation works correctly', async () => {
                vi.spyOn(chessModule, 'isValidFEN').mockReturnValue(true);
                const loadFEN = vi.fn();
                const { getByLabelText } = await renderLoadBoardView({
                    contextOverrides: { loadFEN },
                });

                const fenInput = getByLabelText(/FEN/i);

                // Input should be focused on mount
                await expect.element(fenInput).toHaveFocus();
                await userEvent.fill(fenInput, validFEN);

                // Tab to focus on button
                await userEvent.tab();
                const loadButton = page.getByRole('button', { name: /load/i });
                await expect.element(loadButton).toHaveFocus();

                // Activate button with Space key
                await userEvent.keyboard('{Space}');

                expect(loadFEN).toHaveBeenCalled();
            });
            ```

        - Use `userEvent.fill()` for filling inputs instead of typing character by character unless specifically testing
          typing behavior
        - Use `userEvent.keyboard('{Enter}')`, `userEvent.keyboard('{Space}')`, or similar for simulating key presses
            - Use `userEvent.tab()` for tabbing between focusable elements

    - Test edge cases and error states
    - Avoid testing internal implementation details (e.g., internal state variables, CSS, tailwind classes, etc.)
        - Exception for animations where you may need to check for specific classes being applied
            - e.g. testing that a closing animation class is applied when a drawer is closed

                ```ts
                it('applies closing animation class when shouldClose becomes true', async () => {
                    const { getByRole, rerender } = await renderBottomDrawer({ shouldClose: false });

                    const drawer = getByRole('region', { name: /bottom drawer/i });
                    expect(drawer).toHaveClass('animate-slide-up');
                    expect(drawer).not.toHaveClass('animate-slide-down');

                    await rerender(<BottomDrawer {...defaultProps} shouldClose={true} />);

                    expect(drawer).toHaveClass('animate-slide-down');
                    expect(drawer).not.toHaveClass('animate-slide-up');
                });
                ```

    - No need to test rapid sequences of events (e.g., rapid clicking)

- Asserting that a component renders null or is empty:

    ```ts
    function NullComponent() {
        return null;
    }

    const { container } = await render(<NullComponent />);
    expect(container).toBeEmptyDOMElement();
    ```

#### Mocking strategies

- There are mock context value factories available for common contexts used in the frontend
    - These can be found in the `__mocks__` directories next to the corresponding providers
    - To test components that depend on context, wrap them in the Provider with mock values
        - Context objects are exported from their respective provider files
        - example:

            ```ts
            import { render } from 'vitest-browser-react';
            import PlayerChatPanel, { type PlayerChatPanelProps } from '../PlayerChatPanel';
            import {
                PlayerChatSocketContext,
                type PlayerChatSocketContextType
            } from '../../../providers/PlayerChatSocketProvider';
            import { createMockPlayerChatSocketContextValues } from '../../../providers/__mocks__/PlayerChatSocketProvider';

            type RenderPlayerChatPanelOptions = {
                propOverrides?: Partial<PlayerChatPanelProps>;
                playerChatSocketContextValues?: PlayerChatSocketContextType;
            };
            function renderPlayerChatPanel(
                {
                    propOverrides = {},
                    playerChatSocketContextValues = createMockPlayerChatSocketContextValues()
                }: RenderPlayerChatPanelOptions = {}
            ) {
                return render(
                    <PlayerChatSocketContext.Provider value={playerChatSocketContextValues}>
                        <PlayerChatPanel {...defaultProps} {...propOverrides} />
                    </PlayerChatSocketContext.Provider>
                );
            };

            // Usage in tests:
            it('sends message when Enter key is pressed', async () => {
                const sendStandardMessage = vi.fn();
                const playerChatSocketContextValues = createMockPlayerChatSocketContextValues();
                playerChatSocketContextValues.sendStandardMessage = sendStandardMessage;

                await renderPlayerChatPanel({
                    playerChatSocketContextValues
                });

                // ... test implementation
            });
            ```

- For mocking fetches, refer to docs/FrontendFetching.md for guidelines and examples
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

- Mocking timers and cleanup:

    ```tsx
    describe('Timer Management', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('calls onClosingEnd after 300ms when shouldClose becomes true', async () => {
            const onClosingEnd = vi.fn();
            await renderBottomDrawer({ shouldClose: true, onClosingEnd });

            expect(onClosingEnd).not.toHaveBeenCalled();

            vi.advanceTimersByTime(SLIDE_ANIMATION_DURATION_MS); // 300ms

            expect(onClosingEnd).toHaveBeenCalledOnce();
        });

        it('cleans up timer on unmount during closing animation', async () => {
            const clearTimeoutSpy = vi.spyOn(windowUtilsModule, 'clearTimeout');
            const { unmount } = await renderBottomDrawer({ shouldClose: true });

            expect(clearTimeoutSpy).not.toHaveBeenCalled();

            unmount();

            expect(clearTimeoutSpy).toHaveBeenCalledOnce();
        });

        it('no timer cleanup if component unmounts without closing', async () => {
            const clearTimeoutSpy = vi.spyOn(windowUtilsModule, 'clearTimeout');
            const { unmount } = await renderBottomDrawer({ shouldClose: false });

            unmount();

            expect(clearTimeoutSpy).not.toHaveBeenCalled();
        });
    });
    ```
