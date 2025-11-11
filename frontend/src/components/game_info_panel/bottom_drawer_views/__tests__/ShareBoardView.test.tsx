import * as chessModule from '@grouchess/chess';
import { createMockStartingChessBoardState } from '@grouchess/test-utils';
import { render } from 'vitest-browser-react';

import { ChessGameContext } from '../../../../providers/ChessGameRoomProvider';
import { createMockChessGameContextValues } from '../../../../providers/__mocks__/ChessGameRoomProvider';
import ShareBoardView from '../ShareBoardView';

vi.mock('@grouchess/chess', { spy: true });

describe('ShareBoardView', () => {
    const renderShareBoardView = ({ contextOverrides = {} } = {}) => {
        const contextValue = createMockChessGameContextValues(contextOverrides);
        return render(
            <ChessGameContext.Provider value={contextValue}>
                <ShareBoardView />
            </ChessGameContext.Provider>
        );
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Initial Render and Basic UI', () => {
        it('renders all elements correctly', async () => {
            vi.spyOn(chessModule, 'createFEN').mockReturnValue(
                'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
            );
            const { getByText, getByLabelText, getByRole } = await renderShareBoardView();

            // Check heading
            const heading = getByText('Share Board');
            await expect.element(heading).toBeInTheDocument();

            // Check label
            const label = getByText('FEN');
            await expect.element(label).toBeInTheDocument();

            // Check input field
            const input = getByLabelText('FEN', { exact: true });
            await expect.element(input).toBeInTheDocument();
            await expect.element(input).toHaveAttribute('type', 'text');
            await expect.element(input).toHaveAttribute('readonly');

            // Check copy button
            const copyButton = getByRole('button', { name: /copy fen/i });
            await expect.element(copyButton).toBeInTheDocument();
            await expect.element(copyButton).toHaveAttribute('type', 'button');
        });
    });

    describe('FEN Generation', () => {
        it('calls createFEN with the current board state', async () => {
            const createFENSpy = vi.spyOn(chessModule, 'createFEN').mockReturnValue('test-fen-string');
            const boardState = createMockStartingChessBoardState();

            await renderShareBoardView({
                contextOverrides: {
                    chessGame: {
                        boardState,
                    },
                },
            });

            expect(createFENSpy).toHaveBeenCalledWith(boardState);
            expect(createFENSpy).toHaveBeenCalledTimes(1);
        });

        it('displays the FEN string returned by createFEN', async () => {
            const expectedFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
            vi.spyOn(chessModule, 'createFEN').mockReturnValue(expectedFEN);

            const { getByLabelText } = await renderShareBoardView();

            const input = getByLabelText('FEN', { exact: true });
            expect(input).toHaveValue(expectedFEN);
        });
    });

    describe('CopyableTextField Integration', () => {
        it('passes correct props to CopyableTextField', async () => {
            const expectedFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
            vi.spyOn(chessModule, 'createFEN').mockReturnValue(expectedFEN);

            const { getByLabelText, getByRole, getByText } = await renderShareBoardView();

            // Verify text prop - input should have the FEN value
            const input = getByLabelText('FEN', { exact: true });
            await expect.element(input).toHaveValue(expectedFEN);
            await expect.element(input).toHaveAttribute('id', 'fen-string');
            await expect.element(input).toHaveAttribute('readonly');

            // Verify label prop
            const label = getByText('FEN');
            await expect.element(label).toBeInTheDocument();

            // Verify copyButtonAriaLabel prop
            const copyButton = getByRole('button', { name: /copy fen/i });
            await expect.element(copyButton).toBeInTheDocument();
        });
    });
});
