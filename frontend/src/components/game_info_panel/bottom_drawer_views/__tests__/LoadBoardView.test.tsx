import * as chessModule from '@grouchess/chess';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { ChessGameContext } from '../../../../providers/ChessGameRoomProvider';
import { createMockChessGameContextValues } from '../../../../providers/__mocks__/ChessGameRoomProvider';
import LoadBoardView, { type LoadBoardViewProps } from '../LoadBoardView';

vi.mock('@grouchess/chess', { spy: true });

const VALID_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const INVALID_FEN = 'invalid-fen-string';

describe('LoadBoardView', () => {
    const defaultProps: LoadBoardViewProps = {
        onDismiss: vi.fn(),
    };

    const renderLoadBoardView = ({ propOverrides = {}, contextOverrides = {} } = {}) => {
        const contextValue = createMockChessGameContextValues(contextOverrides);
        return render(
            <ChessGameContext.Provider value={contextValue}>
                <LoadBoardView {...defaultProps} {...propOverrides} />
            </ChessGameContext.Provider>
        );
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Initial Render and Basic UI', () => {
        it('renders all form elements correctly', async () => {
            const { getByRole, getByLabelText, getByText } = await renderLoadBoardView();

            // Check heading
            await expect.element(getByText('Load Board')).toBeInTheDocument();

            // Check input label and field
            const input = getByLabelText(/FEN/i);
            await expect.element(input).toBeInTheDocument();
            await expect.element(input).toHaveAttribute('type', 'text');
            await expect
                .element(input)
                .toHaveAttribute('placeholder', 'e.g. rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

            // Check submit button
            const loadButton = getByRole('button', { name: /load/i });
            await expect.element(loadButton).toBeInTheDocument();
            await expect.element(loadButton).toHaveAttribute('type', 'submit');
        });

        it('auto-focuses the FEN input on mount', async () => {
            const { getByLabelText } = await renderLoadBoardView();

            const input = getByLabelText(/FEN/i);
            await expect.element(input).toHaveFocus();
        });

        it('load button is initially disabled', async () => {
            const { getByRole } = await renderLoadBoardView();

            const loadButton = getByRole('button', { name: /load/i });
            await expect.element(loadButton).toBeDisabled();
        });
    });

    describe('FEN Input and Validation', () => {
        it('accepts valid FEN strings and enables Load button', async () => {
            vi.spyOn(chessModule, 'isValidFEN').mockReturnValue(true);
            const { getByLabelText, getByRole } = await renderLoadBoardView();

            const fenInput = getByLabelText(/FEN/i);
            await userEvent.fill(fenInput, VALID_FEN);

            const errorText = getByRole('alert');
            await expect.element(errorText).not.toBeInTheDocument();

            const loadButton = getByRole('button', { name: /load/i });
            await expect.element(loadButton).toBeEnabled();
        });

        it('shows error for invalid FEN strings and disables Load button', async () => {
            vi.spyOn(chessModule, 'isValidFEN').mockReturnValue(false);
            const { getByLabelText, getByRole } = await renderLoadBoardView();

            const fenInput = getByLabelText(/FEN/i);
            await userEvent.fill(fenInput, INVALID_FEN);

            const errorText = getByRole('alert');
            await expect.element(errorText).toBeInTheDocument();
            expect(errorText).toHaveTextContent('Invalid FEN');

            const loadButton = getByRole('button', { name: /load/i });
            await expect.element(loadButton).toBeDisabled();
        });

        it('trims whitespace during validation', async () => {
            vi.spyOn(chessModule, 'isValidFEN').mockReturnValue(true);
            const { getByLabelText, getByRole } = await renderLoadBoardView();

            const fenInput = getByLabelText(/FEN/i);
            await userEvent.fill(fenInput, `  ${VALID_FEN}  `);

            const errorText = getByRole('alert');
            await expect.element(errorText).not.toBeInTheDocument();

            const loadButton = getByRole('button', { name: /load/i });
            await expect.element(loadButton).toBeEnabled();
        });

        it('clears error when input is emptied', async () => {
            vi.spyOn(chessModule, 'isValidFEN').mockReturnValue(false);
            const { getByLabelText, getByRole } = await renderLoadBoardView();

            const fenInput = getByLabelText(/FEN/i);

            await userEvent.fill(fenInput, INVALID_FEN);

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
    });

    describe('Form Submission and Load Behavior', () => {
        it('submits form via Load button click', async () => {
            vi.spyOn(chessModule, 'isValidFEN').mockReturnValue(true);
            const loadFEN = vi.fn();
            const onDismiss = vi.fn();
            const { getByLabelText, getByRole } = await renderLoadBoardView({
                propOverrides: { onDismiss },
                contextOverrides: { loadFEN },
            });

            const fenInput = getByLabelText(/FEN/i);

            await userEvent.fill(fenInput, VALID_FEN);

            const loadButton = getByRole('button', { name: /load/i });
            await loadButton.click();

            expect(loadFEN).toHaveBeenCalledWith(VALID_FEN);
            expect(onDismiss).toHaveBeenCalled();
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
            const validFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
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
            await userEvent.fill(fenInput, 'invalid-fen');

            // Button should be disabled with invalid FEN
            const loadButton = getByRole('button', { name: /load/i });
            await expect.element(loadButton).toBeDisabled();

            // Try to submit via Enter key (should do nothing)
            await userEvent.keyboard('{Enter}');

            expect(loadFEN).not.toHaveBeenCalled();
            expect(onDismiss).not.toHaveBeenCalled();
        });

        it('prevents submission with empty input', async () => {
            const loadFEN = vi.fn();
            const onDismiss = vi.fn();
            const { getByLabelText } = await renderLoadBoardView({
                propOverrides: { onDismiss },
                contextOverrides: { loadFEN },
            });

            const fenInput = getByLabelText(/FEN/i);
            await expect.element(fenInput).toHaveFocus();
            await userEvent.keyboard('{Enter}');

            // handleLoad's guard should prevent loadFEN and onDismiss from being called
            expect(loadFEN).not.toHaveBeenCalled();
            expect(onDismiss).not.toHaveBeenCalled();
        });

        it('trims whitespace before calling loadFEN', async () => {
            vi.spyOn(chessModule, 'isValidFEN').mockReturnValue(true);
            const loadFEN = vi.fn();
            const onDismiss = vi.fn();
            const { getByLabelText } = await renderLoadBoardView({
                propOverrides: { onDismiss },
                contextOverrides: { loadFEN },
            });

            const fenInput = getByLabelText(/FEN/i);
            const fenWithSpaces = `  ${VALID_FEN}  `;
            await userEvent.fill(fenInput, fenWithSpaces);

            await page.getByRole('button', { name: /load/i }).click();

            expect(loadFEN).toHaveBeenCalledWith(VALID_FEN);
            expect(onDismiss).toHaveBeenCalled();
        });
    });

    describe('Accessibility Features', () => {
        it('error message has proper role and is announced', async () => {
            vi.spyOn(chessModule, 'isValidFEN').mockReturnValue(false);
            const { getByLabelText, getByRole } = await renderLoadBoardView();

            const fenInput = getByLabelText(/FEN/i);
            await userEvent.fill(fenInput, INVALID_FEN);

            const errorMessage = getByRole('alert');
            await expect.element(errorMessage).toBeInTheDocument();
            await expect.element(errorMessage).toHaveAttribute('role', 'alert');
            await expect.element(errorMessage).toHaveAttribute('id', 'fen-error');
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
            await userEvent.fill(fenInput, VALID_FEN);

            // Tab to focus on button
            await userEvent.tab();
            const loadButton = page.getByRole('button', { name: /load/i });
            await expect.element(loadButton).toHaveFocus();

            // Activate button with Space key
            await userEvent.keyboard('{Space}');

            expect(loadFEN).toHaveBeenCalled();
        });

        it('input has aria-invalid and aria-describedby when error is shown', async () => {
            vi.spyOn(chessModule, 'isValidFEN').mockReturnValue(false);
            const { getByLabelText } = await renderLoadBoardView();

            const fenInput = getByLabelText(/FEN/i);

            // Initially should not have aria-invalid and aria-describedby
            await expect.element(fenInput).toHaveAttribute('aria-invalid', 'false');
            expect(fenInput.element().getAttribute('aria-describedby')).toBeNull();

            await userEvent.fill(fenInput, INVALID_FEN);

            // Should now have aria-invalid="true" and aria-describedby linking to error message
            await expect.element(fenInput).toHaveAttribute('aria-invalid', 'true');
            await expect.element(fenInput).toHaveAttribute('aria-describedby', 'fen-error');
        });
    });
});
