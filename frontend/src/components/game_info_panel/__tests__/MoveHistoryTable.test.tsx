import type { ChessGameStatus, MoveNotation, MoveRecord, PieceColor, RoomType } from '@grouchess/models';
import { createMockMoveRecord, createMockMoveNotation, sicilianDefenseMoves } from '@grouchess/test-utils';
import { render } from 'vitest-browser-react';

import {
    ChessGameContext,
    type ChessGameContextType,
    GameRoomContext,
    type GameRoomContextType,
} from '../../../providers/ChessGameRoomProvider';
import {
    createMockChessGameContextValues,
    createMockGameRoomContextValues,
} from '../../../providers/__mocks__/ChessGameRoomProvider';
import MoveHistoryTable, { type MoveHistoryTableProps, createMovePairs } from '../MoveHistoryTable';

// Mock child components
vi.mock('../MoveHistoryTableRow', () => ({
    default: vi.fn(({ movePair, moveNumber, notationStyle = 'san', isLastRow, lastMoveIsBlack }) => (
        <tr data-testid={`mock-move-history-table-row-${moveNumber}`}>
            <td>{movePair[0][notationStyle || 'san']}</td>
            <td>{movePair[1]?.[notationStyle || 'san'] || '—'}</td>
            <td>isLastRow: {String(isLastRow)}</td>
            <td>lastMoveIsBlack: {String(lastMoveIsBlack)}</td>
        </tr>
    )),
}));

vi.mock('../GameResultCardController', () => ({
    default: vi.fn(({ gameState, isSelfPlay, onExitClick }) => (
        <div>
            GameResultCardController - status: {gameState.status}, isSelfPlay: {isSelfPlay.toString()}
            <button onClick={onExitClick}>Exit</button>
        </div>
    )),
}));

function renderMoveHistoryTable({
    propsOverrides = {},
    chessGameOverrides = {},
    gameRoomOverrides = {},
}: {
    propsOverrides?: Partial<MoveHistoryTableProps>;
    chessGameOverrides?: Partial<ChessGameContextType>;
    gameRoomOverrides?: Partial<GameRoomContextType>;
} = {}) {
    const props: MoveHistoryTableProps = {
        onExitClick: vi.fn(),
        ...propsOverrides,
    };
    const chessGameContextValues = createMockChessGameContextValues(chessGameOverrides);
    const gameRoomContextValues = createMockGameRoomContextValues(gameRoomOverrides);

    return render(
        <GameRoomContext.Provider value={gameRoomContextValues}>
            <ChessGameContext.Provider value={chessGameContextValues}>
                <MoveHistoryTable {...props} />
            </ChessGameContext.Provider>
        </GameRoomContext.Provider>
    );
}

describe('createMovePairs', () => {
    it('returns empty array for empty input', () => {
        expect(createMovePairs([])).toEqual([]);
    });

    it('creates single pair from two moves', () => {
        const moves: MoveNotation[] = [
            { san: 'e4', uci: 'e2e4', figurine: '\u2654' },
            { san: 'e5', uci: 'e7e5', figurine: '\u265A' },
        ];
        const expectedPairs = [[moves[0], moves[1]]];
        expect(createMovePairs(moves)).toEqual(expectedPairs);
    });

    it.each([
        { scenario: '4 moves', moveCount: 4, expectedPairs: 2 },
        { scenario: '6 moves', moveCount: 6, expectedPairs: 3 },
        { scenario: '8 moves', moveCount: 8, expectedPairs: 4 },
        { scenario: '1 move', moveCount: 1, expectedPairs: 1 },
        { scenario: '3 moves', moveCount: 3, expectedPairs: 2 },
        { scenario: '5 moves', moveCount: 5, expectedPairs: 3 },
    ])('creates $expectedPairs pairs from $scenario', ({ moveCount, expectedPairs }) => {
        const moves: MoveNotation[] = [...Array(moveCount)].map(() => createMockMoveNotation());
        const pairs = createMovePairs(moves);
        expect(pairs.length).toBe(expectedPairs);
    });

    it('preserves move order in pairs', () => {
        const moves: MoveNotation[] = [
            { san: 'e4', uci: 'e2e4', figurine: '\u2654' },
            { san: 'e5', uci: 'e7e5', figurine: '\u265A' },
            { san: 'Nf3', uci: 'g1f3', figurine: '\u2654' },
            { san: 'Nc6', uci: 'b8c6', figurine: '\u265A' },
        ];
        const pairs = createMovePairs(moves);
        expect(pairs).toEqual([
            [moves[0], moves[1]],
            [moves[2], moves[3]],
        ]);
    });
});

describe('MoveHistoryTable', () => {
    describe('Initial rendering', () => {
        it('renders empty table with no moves', async () => {
            const { getByRole } = await renderMoveHistoryTable();

            const table = getByRole('table');
            await expect.element(table).toBeInTheDocument();
        });
    });

    describe('Move history display', () => {
        it('renders single move (white only)', async () => {
            const moveRecord = createMockMoveRecord();
            const moves: MoveRecord[] = [moveRecord];
            const chessGameOverrides = createMockChessGameContextValues();
            chessGameOverrides.chessGame.moveHistory = moves;

            const { getByText } = await renderMoveHistoryTable({ chessGameOverrides });

            expect(getByText(moveRecord.notation.san)).toBeInTheDocument();
        });

        it('renders complete move pair', async () => {
            const moves: MoveRecord[] = [
                createMockMoveRecord(),
                createMockMoveRecord({
                    notation: createMockMoveNotation({ san: 'Nc6', figurine: '\u265A', uci: 'b8c6' }),
                }),
            ];
            const chessGameOverrides = createMockChessGameContextValues();
            chessGameOverrides.chessGame.moveHistory = moves;

            const { getByText } = await renderMoveHistoryTable({ chessGameOverrides });

            expect(getByText(moves[0].notation.san)).toBeInTheDocument();
            expect(getByText(moves[1].notation.san)).toBeInTheDocument();
        });

        it.each([
            {
                scenario: 'white move last',
                numMoves: 1,
                expectedLastMoveIsBlack: false,
            },
            {
                scenario: 'black move last',
                numMoves: 2,
                expectedLastMoveIsBlack: true,
            },
            {
                scenario: 'white move last with multiple pairs',
                numMoves: 5,
                expectedLastMoveIsBlack: false,
            },
            {
                scenario: 'black move last with multiple pairs',
                numMoves: 6,
                expectedLastMoveIsBlack: true,
            },
        ])(
            'identifies last row and last move color correctly - $scenario',
            async ({ numMoves, expectedLastMoveIsBlack }) => {
                const moves: MoveRecord[] = sicilianDefenseMoves
                    .slice(0, numMoves)
                    .map((notation) => createMockMoveRecord({ notation }));
                const chessGameOverrides = createMockChessGameContextValues();
                chessGameOverrides.chessGame.moveHistory = moves;

                const { getByTestId } = await renderMoveHistoryTable({ chessGameOverrides });

                const lastMoveNumber = Math.floor((moves.length - 1) / 2) + 1;
                const lastRow = getByTestId(`mock-move-history-table-row-${lastMoveNumber}`);

                await expect.element(lastRow).toBeInTheDocument();
                await expect.element(lastRow.getByText(moves[moves.length - 1].notation.san)).toBeInTheDocument();
                await expect.element(lastRow.getByText(`isLastRow: true`)).toBeInTheDocument();
                await expect
                    .element(lastRow.getByText(`lastMoveIsBlack: ${expectedLastMoveIsBlack}`))
                    .toBeInTheDocument();
            }
        );
    });

    describe('Auto-scroll behavior', () => {
        it('scrolls when new move is added', async () => {
            const moves: MoveRecord[] = sicilianDefenseMoves.map((notation) => createMockMoveRecord({ notation }));
            const chessGameOverrides = createMockChessGameContextValues();
            chessGameOverrides.chessGame.moveHistory = moves.slice(0, moves.length - 1);

            const { rerender, getByText } = await renderMoveHistoryTable({ chessGameOverrides });

            // Add new move
            chessGameOverrides.chessGame.moveHistory = moves;
            rerender(
                <GameRoomContext.Provider value={createMockGameRoomContextValues()}>
                    <ChessGameContext.Provider value={chessGameOverrides}>
                        <MoveHistoryTable onExitClick={vi.fn()} />
                    </ChessGameContext.Provider>
                </GameRoomContext.Provider>
            );

            const lastMove = moves[moves.length - 1];
            await expect.element(getByText(lastMove.notation.san)).toBeInViewport();
        });

        it('scrolls when game ends', async () => {
            const chessGameOverrides = createMockChessGameContextValues();
            chessGameOverrides.chessGame.gameState.status = 'in-progress';

            const { rerender, getByText } = await renderMoveHistoryTable({ chessGameOverrides });
            const resultCard = getByText(/GameResultCardController/i);

            await expect.element(resultCard).not.toBeInTheDocument();

            // End the game
            chessGameOverrides.chessGame.gameState.status = 'checkmate';
            rerender(
                <GameRoomContext.Provider value={createMockGameRoomContextValues()}>
                    <ChessGameContext.Provider value={chessGameOverrides}>
                        <MoveHistoryTable onExitClick={vi.fn()} />
                    </ChessGameContext.Provider>
                </GameRoomContext.Provider>
            );

            await expect.element(resultCard).toBeInViewport();
            expect(resultCard).toHaveTextContent('status: checkmate');
        });
    });

    describe('Game result display', () => {
        it.each([
            { scenario: 'checkmate', status: 'checkmate', winner: 'white' },
            { scenario: 'stalemate', status: 'stalemate', winner: undefined },
            { scenario: 'resigned', status: 'resigned', winner: 'black' },
            { scenario: 'timeout', status: 'time-out', winner: 'white' },
        ])('shows GameResultCardController when game ends - $scenario', async ({ status, winner }) => {
            const chessGameOverrides = createMockChessGameContextValues();
            chessGameOverrides.chessGame.gameState.status = status as ChessGameStatus;
            chessGameOverrides.chessGame.gameState.winner = winner as PieceColor | undefined;

            const { getByText } = await renderMoveHistoryTable({ chessGameOverrides });

            const resultCard = getByText(/GameResultCardController/i);
            await expect.element(resultCard).toBeInTheDocument();
            await expect.element(resultCard).toHaveTextContent(`status: ${status}`);
        });

        it('does not show GameResultCardController during game', async () => {
            const chessGameOverrides = createMockChessGameContextValues();
            chessGameOverrides.chessGame.gameState.status = 'in-progress';

            const { getByText } = await renderMoveHistoryTable({ chessGameOverrides });

            const resultCard = getByText(/GameResultCardController/i);
            await expect.element(resultCard).not.toBeInTheDocument();
        });

        it.each([
            { scenario: 'self-play room', roomType: 'self', expectedIsSelfPlay: true },
            { scenario: 'cpu room', roomType: 'player-vs-cpu', expectedIsSelfPlay: false },
            { scenario: 'pvp room', roomType: 'player-vs-player', expectedIsSelfPlay: false },
        ])('handles different room types for result card - $scenario', async ({ roomType, expectedIsSelfPlay }) => {
            const chessGameOverrides = createMockChessGameContextValues();
            chessGameOverrides.chessGame.gameState.status = 'checkmate';

            const gameRoomOverrides = createMockGameRoomContextValues();
            gameRoomOverrides.gameRoom.type = roomType as RoomType;

            const { getByText } = await renderMoveHistoryTable({
                chessGameOverrides,
                gameRoomOverrides,
            });

            const resultCard = getByText(/GameResultCardController/i);
            await expect.element(resultCard).toBeInTheDocument();
            await expect.element(resultCard).toHaveTextContent(`isSelfPlay: ${expectedIsSelfPlay}`);
        });
    });
});
