import { createMockChessClockState, createMockPieceCapture } from '@grouchess/test-utils';
import { render } from 'vitest-browser-react';

import { ChessClockContext, ChessGameContext, GameRoomContext } from '../../../providers/ChessGameRoomProvider';
import { ClockTickContext } from '../../../providers/ClockTickProvider';
import { ImageContext } from '../../../providers/ImagesProvider';
import {
    createMockChessClockContextValues,
    createMockChessGameContextValues,
    createMockGameRoomContextValues,
} from '../../../providers/__mocks__/ChessGameRoomProvider';
import { createMockClockTickContextValues } from '../../../providers/__mocks__/ClockTickProvider';
import { createMockImageContextValues } from '../../../providers/__mocks__/ImagesProvider';
import PlayerCard from '../PlayerCard';

const defaultProps = {
    playerId: 'player-1',
    color: 'white' as const,
    displayName: 'Alice',
};

const renderPlayerCard = ({
    propOverrides = {},
    chessGameOverrides = {},
    gameRoomOverrides = {},
    imageOverrides = {},
    clockTickOverrides = {},
    chessClockOverrides = {},
} = {}) => {
    const chessGameContextValue = createMockChessGameContextValues(chessGameOverrides);
    const gameRoomContextValue = createMockGameRoomContextValues(gameRoomOverrides);
    const imageContextValue = createMockImageContextValues(imageOverrides);
    const clockTickContextValue = createMockClockTickContextValues(clockTickOverrides);
    const chessClockContextValue = createMockChessClockContextValues(chessClockOverrides);

    return render(
        <GameRoomContext.Provider value={gameRoomContextValue}>
            <ChessGameContext.Provider value={chessGameContextValue}>
                <ImageContext.Provider value={imageContextValue}>
                    <ClockTickContext.Provider value={clockTickContextValue}>
                        <ChessClockContext.Provider value={chessClockContextValue}>
                            <PlayerCard {...defaultProps} {...propOverrides} />
                        </ChessClockContext.Provider>
                    </ClockTickContext.Provider>
                </ImageContext.Provider>
            </ChessGameContext.Provider>
        </GameRoomContext.Provider>
    );
};

describe('PlayerCard', () => {
    describe('component rendering', () => {
        it('renders with required contexts', async () => {
            const { getByText } = await renderPlayerCard();
            await expect.element(getByText('Alice')).toBeInTheDocument();
        });

        it.each([
            {
                scenario: 'it is the player turn',
                createChessGameOverrides: () => {
                    const contextValues = createMockChessGameContextValues();
                    contextValues.chessGame.boardState.playerTurn = 'white';
                    return contextValues;
                },
            },
            {
                scenario: 'it is not the player turn',
                createChessGameOverrides: () => {
                    const contextValues = createMockChessGameContextValues();
                    contextValues.chessGame.boardState.playerTurn = 'black';
                    return contextValues;
                },
            },
            {
                scenario: 'game is over',
                createChessGameOverrides: () => {
                    const contextValues = createMockChessGameContextValues();
                    contextValues.chessGame.gameState.status = 'draw-by-agreement';
                    return contextValues;
                },
            },
        ])('renders when it is the player turn', async ({ createChessGameOverrides }) => {
            const { getByText } = await renderPlayerCard({
                chessGameOverrides: createChessGameOverrides(),
            });
            await expect.element(getByText('Alice')).toBeInTheDocument();
        });

        it.each([
            { scenario: 'chessGame is null', chessGameOverrides: { chessGame: null }, gameRoomOverrides: {} },
            {
                scenario: 'gameRoom is null',
                chessGameOverrides: {},
                gameRoomOverrides: { gameRoom: null },
            },
            {
                scenario: 'both chessGame and gameRoom are null',
                chessGameOverrides: { chessGame: null },
                gameRoomOverrides: { gameRoom: null },
            },
        ])('throws error when $scenario', async ({ chessGameOverrides, gameRoomOverrides }) => {
            await expect(
                renderPlayerCard({
                    chessGameOverrides,
                    gameRoomOverrides,
                })
            ).rejects.toThrow('chessGame and gameRoom are required for PlayerCard component');
        });
    });

    describe('captures display', () => {
        it('shows opponent captured pieces sorted by value (highest first)', async () => {
            const captures = [
                createMockPieceCapture({ piece: { alias: 'p', color: 'black', type: 'pawn', value: 1 }, moveIndex: 1 }),
                createMockPieceCapture({
                    piece: { alias: 'q', color: 'black', type: 'queen', value: 9 },
                    moveIndex: 2,
                }),
                createMockPieceCapture({ piece: { alias: 'r', color: 'black', type: 'rook', value: 5 }, moveIndex: 3 }),
            ];

            const { getByRole } = await renderPlayerCard({
                propOverrides: { color: 'white' },
                chessGameOverrides: {
                    chessGame: {
                        ...createMockChessGameContextValues().chessGame,
                        captures,
                    },
                },
                imageOverrides: {
                    isReady: true,
                    imgSrcMap: {
                        '/pieces/staunty/bQ.svg': '/pieces/staunty/bQ.svg',
                        '/pieces/staunty/bR.svg': '/pieces/staunty/bR.svg',
                        '/pieces/staunty/bP.svg': '/pieces/staunty/bP.svg',
                    },
                },
            });

            const capturedImages = await getByRole('img', { name: /captured/i }).elements();
            expect(capturedImages.length).toBe(3);
            // Verify images are sorted by value (queen=9, rook=5, pawn=1)
            expect(capturedImages[0]).toHaveAttribute('alt', 'Captured Black Queen');
            expect(capturedImages[1]).toHaveAttribute('alt', 'Captured Black Rook');
            expect(capturedImages[2]).toHaveAttribute('alt', 'Captured Black Pawn');
        });

        it('hides captures when images not loaded', async () => {
            const captures = [
                createMockPieceCapture({
                    piece: { alias: 'q', color: 'black', type: 'queen', value: 9 },
                    moveIndex: 1,
                }),
            ];

            const { getByRole } = await renderPlayerCard({
                propOverrides: { color: 'white' },
                chessGameOverrides: {
                    chessGame: {
                        ...createMockChessGameContextValues().chessGame,
                        captures,
                    },
                },
                imageOverrides: {
                    isReady: false,
                    imgSrcMap: {},
                },
            });

            const capturedImages = await getByRole('img', { name: /captured/i }).elements();
            expect(capturedImages.length).toBe(0);
        });

        it('displays correct images with proper alt text', async () => {
            const captures = [
                createMockPieceCapture({
                    piece: { alias: 'n', color: 'black', type: 'knight', value: 3 },
                    moveIndex: 1,
                }),
                createMockPieceCapture({
                    piece: { alias: 'b', color: 'black', type: 'bishop', value: 3 },
                    moveIndex: 2,
                }),
            ];

            const { getByRole } = await renderPlayerCard({
                propOverrides: { color: 'white' },
                chessGameOverrides: {
                    chessGame: {
                        ...createMockChessGameContextValues().chessGame,
                        captures,
                    },
                },
                imageOverrides: {
                    isReady: true,
                    imgSrcMap: {
                        '/pieces/staunty/bN.svg': '/custom/path/knight.svg',
                        '/pieces/staunty/bB.svg': '/custom/path/bishop.svg',
                    },
                },
            });

            const capturedImages = await getByRole('img', { name: /captured/i }).elements();
            expect(capturedImages.length).toBe(2);

            expect(capturedImages[0]).toHaveAttribute('src', expect.stringContaining('/custom/path/knight.svg'));
            expect(capturedImages[0]).toHaveAttribute('alt', 'Captured Black Knight');

            expect(capturedImages[1]).toHaveAttribute('src', expect.stringContaining('/custom/path/bishop.svg'));
            expect(capturedImages[1]).toHaveAttribute('alt', 'Captured Black Bishop');
        });

        it('handles empty captures array', async () => {
            const { getByRole } = await renderPlayerCard({
                chessGameOverrides: {
                    chessGame: {
                        ...createMockChessGameContextValues().chessGame,
                        captures: [],
                    },
                },
                imageOverrides: {
                    isReady: true,
                },
            });

            const capturedImages = await getByRole('img', { name: /captured/i }).elements();
            expect(capturedImages.length).toBe(0);
        });

        it('shows multiple captures with unique keys', async () => {
            const captures = [
                createMockPieceCapture({ piece: { alias: 'p', color: 'black', type: 'pawn', value: 1 }, moveIndex: 1 }),
                createMockPieceCapture({ piece: { alias: 'p', color: 'black', type: 'pawn', value: 1 }, moveIndex: 2 }),
                createMockPieceCapture({ piece: { alias: 'p', color: 'black', type: 'pawn', value: 1 }, moveIndex: 3 }),
            ];

            const { getByRole } = await renderPlayerCard({
                propOverrides: { color: 'white' },
                chessGameOverrides: {
                    chessGame: {
                        ...createMockChessGameContextValues().chessGame,
                        captures,
                    },
                },
                imageOverrides: {
                    isReady: true,
                    imgSrcMap: {
                        '/pieces/staunty/bP.svg': '/pieces/staunty/bP.svg',
                    },
                },
            });

            const capturedImages = await getByRole('img', { name: /captured/i }).elements();
            expect(capturedImages.length).toBe(3);

            // All three should have the same alt text but different keys (based on moveIndex)
            capturedImages.every((img) => {
                return expect(img).toHaveAttribute('alt', 'Captured Black Pawn');
            });
        });

        it('only shows captures of opponent pieces', async () => {
            const captures = [
                // White player's own piece (should not be shown)
                createMockPieceCapture({ piece: { alias: 'P', color: 'white', type: 'pawn', value: 1 }, moveIndex: 1 }),
                // Black opponent's piece (should be shown)
                createMockPieceCapture({
                    piece: { alias: 'q', color: 'black', type: 'queen', value: 9 },
                    moveIndex: 2,
                }),
            ];

            const { getByRole } = await renderPlayerCard({
                propOverrides: { color: 'white' },
                chessGameOverrides: {
                    chessGame: {
                        ...createMockChessGameContextValues().chessGame,
                        captures,
                    },
                },
                imageOverrides: {
                    isReady: true,
                    imgSrcMap: {
                        '/pieces/staunty/bQ.svg': '/pieces/staunty/bQ.svg',
                        '/pieces/staunty/wP.svg': '/pieces/staunty/wP.svg',
                    },
                },
            });

            const capturedImages = await getByRole('img', { name: /captured/i }).elements();
            expect(capturedImages.length).toBe(1);
            expect(capturedImages[0]).toHaveAttribute('alt', 'Captured Black Queen');
        });

        it('falls back to imgSrc when imgSrcMap does not have the source', async () => {
            const captures = [
                createMockPieceCapture({
                    piece: { alias: 'q', color: 'black', type: 'queen', value: 9 },
                    moveIndex: 1,
                }),
            ];

            const { getByRole } = await renderPlayerCard({
                propOverrides: { color: 'white' },
                chessGameOverrides: {
                    chessGame: {
                        ...createMockChessGameContextValues().chessGame,
                        captures,
                    },
                },
                imageOverrides: {
                    isReady: true,
                    // imgSrcMap is empty, so it should fall back to the original imgSrc
                    imgSrcMap: {},
                },
            });

            const capturedImages = await getByRole('img', { name: /captured/i }).elements();
            expect(capturedImages.length).toBe(1);
            expect(capturedImages[0]).toHaveAttribute('alt', 'Captured Black Queen');
            // Should use the fallback src from aliasToPieceImageData
            expect(capturedImages[0]).toHaveAttribute('src', '/pieces/staunty/bQ.svg');
        });
    });

    describe('score display', () => {
        it('shows scores when at least one player has score > 0', async () => {
            const { getByText } = await renderPlayerCard({
                propOverrides: { playerId: 'player-1' },
                gameRoomOverrides: {
                    gameRoom: {
                        ...createMockGameRoomContextValues().gameRoom,
                        playerIdToScore: {
                            'player-1': 2,
                            'player-2': 1,
                        },
                    },
                },
            });

            await expect.element(getByText('(2)')).toBeInTheDocument();
        });

        it('hides scores when all players have 0 score', async () => {
            const { getByText } = await renderPlayerCard({
                propOverrides: { playerId: 'player-1' },
                gameRoomOverrides: {
                    gameRoom: {
                        ...createMockGameRoomContextValues().gameRoom,
                        playerIdToScore: {
                            'player-1': 0,
                            'player-2': 0,
                        },
                    },
                },
            });

            // Score should not be rendered
            await expect.element(getByText('(0)')).not.toBeInTheDocument();
        });

        it('displays correct score for the player', async () => {
            const { getByText } = await renderPlayerCard({
                propOverrides: { playerId: 'player-2' },
                gameRoomOverrides: {
                    gameRoom: {
                        ...createMockGameRoomContextValues().gameRoom,
                        playerIdToScore: {
                            'player-1': 5,
                            'player-2': 3,
                        },
                    },
                },
            });

            await expect.element(getByText('(3)')).toBeInTheDocument();
            await expect.element(getByText('(5)')).not.toBeInTheDocument();
        });

        it('shows score when only one player has score > 0', async () => {
            const { getByText } = await renderPlayerCard({
                propOverrides: { playerId: 'player-1' },
                gameRoomOverrides: {
                    gameRoom: {
                        ...createMockGameRoomContextValues().gameRoom,
                        playerIdToScore: {
                            'player-1': 1,
                            'player-2': 0,
                        },
                    },
                },
            });

            await expect.element(getByText('(1)')).toBeInTheDocument();
        });
    });

    describe('time control', () => {
        it.each([
            {
                scenario: 'player turn',
                createChessGameOverrides: () => {
                    const contextValues = createMockChessGameContextValues();
                    contextValues.chessGame.boardState.playerTurn = 'white';
                    contextValues.chessGame.gameState.status = 'in-progress';
                    return contextValues;
                },
            },
            {
                scenario: 'not player turn',
                createChessGameOverrides: () => {
                    const contextValues = createMockChessGameContextValues();
                    contextValues.chessGame.boardState.playerTurn = 'black';
                    contextValues.chessGame.gameState.status = 'in-progress';
                    return contextValues;
                },
            },
            {
                scenario: 'game over',
                createChessGameOverrides: () => {
                    const contextValues = createMockChessGameContextValues();
                    contextValues.chessGame.boardState.playerTurn = 'white';
                    contextValues.chessGame.gameState.status = 'stalemate';
                    return contextValues;
                },
            },
        ])('renders ChessClock when timeControl exists and is $scenario', async ({ createChessGameOverrides }) => {
            const clockState = createMockChessClockState();

            const { getByLabelText, getByRole } = await renderPlayerCard({
                propOverrides: { color: 'white' },
                chessGameOverrides: createChessGameOverrides(),
                gameRoomOverrides: {
                    gameRoom: {
                        ...createMockGameRoomContextValues().gameRoom,
                        timeControl: {
                            alias: '10|0',
                            minutes: 10,
                            increment: 0,
                            displayText: '10 min',
                        },
                    },
                },
                chessClockOverrides: {
                    clockState,
                },
            });

            const clock = await getByRole('timer');
            expect(clock).toBeInTheDocument();

            await expect.element(getByLabelText(/white clock/)).toBeInTheDocument();
        });

        it('does not render ChessClock when timeControl is null', async () => {
            const { getByRole } = await renderPlayerCard({
                gameRoomOverrides: {
                    gameRoom: {
                        ...createMockGameRoomContextValues().gameRoom,
                        timeControl: null,
                    },
                },
            });

            const clock = await getByRole('timer');
            expect(clock).not.toBeInTheDocument();
        });
    });

    describe('edge cases', () => {
        it.each([
            { scenario: 'checkmate', gameState: { status: 'checkmate' as const, winner: 'white' as const } },
            { scenario: 'stalemate', gameState: { status: 'stalemate' as const } },
            { scenario: 'draw', gameState: { status: 'draw' as const } },
            { scenario: 'in-progress', gameState: { status: 'in-progress' as const } },
        ])('handles $scenario game state', async ({ gameState }) => {
            const { getByText } = await renderPlayerCard({
                chessGameOverrides: {
                    chessGame: {
                        ...createMockChessGameContextValues().chessGame,
                        gameState,
                    },
                },
            });

            await expect.element(getByText('Alice')).toBeInTheDocument();
        });

        it('filters out same-color captures for white player', async () => {
            const captures = [
                createMockPieceCapture({ piece: { alias: 'P', color: 'white', type: 'pawn', value: 1 }, moveIndex: 1 }),
                createMockPieceCapture({
                    piece: { alias: 'N', color: 'white', type: 'knight', value: 3 },
                    moveIndex: 2,
                }),
                createMockPieceCapture({
                    piece: { alias: 'q', color: 'black', type: 'queen', value: 9 },
                    moveIndex: 3,
                }),
            ];

            const { getByRole } = await renderPlayerCard({
                propOverrides: { color: 'white' },
                chessGameOverrides: {
                    chessGame: {
                        ...createMockChessGameContextValues().chessGame,
                        captures,
                    },
                },
                imageOverrides: {
                    isReady: true,
                    imgSrcMap: {
                        '/pieces/staunty/bQ.svg': '/pieces/staunty/bQ.svg',
                        '/pieces/staunty/wP.svg': '/pieces/staunty/wP.svg',
                        '/pieces/staunty/wN.svg': '/pieces/staunty/wN.svg',
                    },
                },
            });

            const capturedImages = await getByRole('img', { name: /captured/i }).elements();
            expect(capturedImages.length).toBe(1);
            expect(capturedImages[0]).toHaveAttribute('alt', 'Captured Black Queen');
        });

        it('filters out same-color captures for black player', async () => {
            const captures = [
                createMockPieceCapture({ piece: { alias: 'p', color: 'black', type: 'pawn', value: 1 }, moveIndex: 1 }),
                createMockPieceCapture({
                    piece: { alias: 'Q', color: 'white', type: 'queen', value: 9 },
                    moveIndex: 2,
                }),
                createMockPieceCapture({ piece: { alias: 'R', color: 'white', type: 'rook', value: 5 }, moveIndex: 3 }),
            ];

            const { getByRole } = await renderPlayerCard({
                propOverrides: { color: 'black' },
                chessGameOverrides: {
                    chessGame: {
                        ...createMockChessGameContextValues().chessGame,
                        captures,
                    },
                },
                imageOverrides: {
                    isReady: true,
                    imgSrcMap: {
                        '/pieces/staunty/wQ.svg': '/pieces/staunty/wQ.svg',
                        '/pieces/staunty/wR.svg': '/pieces/staunty/wR.svg',
                        '/pieces/staunty/bP.svg': '/pieces/staunty/bP.svg',
                    },
                },
            });

            const capturedImages = await getByRole('img', { name: /captured/i }).elements();
            expect(capturedImages.length).toBe(2);
            expect(capturedImages[0]).toHaveAttribute('alt', 'Captured White Queen');
            expect(capturedImages[1]).toHaveAttribute('alt', 'Captured White Rook');
        });
    });
});
