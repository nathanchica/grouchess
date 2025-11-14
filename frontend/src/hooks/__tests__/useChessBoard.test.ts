import type {
    BoardIndex,
    ChessBoardType,
    ChessGameRoom,
    ChessGameState,
    LegalMovesStore,
    PieceColor,
} from '@grouchess/models';
import {
    createMockChessBoard,
    createMockChessBoardState,
    createMockChessGame,
    createMockChessGameRoom,
    createMockChessGameState,
    createMockLegalMovesStore,
    createMockMove,
} from '@grouchess/test-utils';
import { renderHook } from 'vitest-browser-react';

import { useChessGame, useGameRoom, type ChessGameContextType } from '../../providers/ChessGameRoomProvider';
import {
    createMockChessGameContextValues,
    createMockGameRoomContextValues,
} from '../../providers/__mocks__/ChessGameRoomProvider';
import type { PendingPromotion } from '../../utils/types';
import { useChessBoard } from '../useChessBoard';

vi.mock('../../providers/ChessGameRoomProvider', () => ({
    useChessGame: vi.fn(),
    useGameRoom: vi.fn(),
}));

type RenderUseChessBoardOptions = {
    board?: ChessBoardType;
    playerTurn?: PieceColor;
    previousMoveIndices?: BoardIndex[];
    pendingPromotion?: PendingPromotion | null;
    legalMovesStore?: LegalMovesStore;
    gameStatus?: ChessGameState['status'];
    checkedColor?: PieceColor;
    currentPlayerColor?: PieceColor;
    roomType?: ChessGameRoom['type'];
    movePiece?: ChessGameContextType['movePiece'];
};

async function renderUseChessBoard(options: RenderUseChessBoardOptions = {}) {
    const movePiece = options.movePiece ?? vi.fn();

    const boardState = createMockChessBoardState({
        board: options.board ?? createMockChessBoard(),
        playerTurn: options.playerTurn ?? 'white',
    });

    const chessGame = {
        ...createMockChessGame({
            boardState,
            legalMovesStore: options.legalMovesStore ?? createMockLegalMovesStore(),
            gameState: createMockChessGameState({
                status: options.gameStatus ?? 'in-progress',
                check: options.checkedColor,
            }),
        }),
        previousMoveIndices: options.previousMoveIndices ?? [],
        timelineVersion: 0,
        pendingPromotion: options.pendingPromotion ?? null,
    };

    const chessGameContext = createMockChessGameContextValues({
        chessGame,
        movePiece,
    });

    const gameRoomContext = createMockGameRoomContextValues({
        gameRoom: createMockChessGameRoom({
            type: options.roomType ?? 'player-vs-player',
        }),
        currentPlayerColor: options.currentPlayerColor ?? 'white',
    });

    vi.mocked(useChessGame).mockReturnValue(chessGameContext);
    vi.mocked(useGameRoom).mockReturnValue(gameRoomContext);

    const renderResult = await renderHook(() => useChessBoard());

    return {
        ...renderResult,
        movePiece,
    };
}

describe('useChessBoard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns chess board state and actions when it is the current player turn', async () => {
        const board = createMockChessBoard({ 0: 'R' });
        const previousMoveIndices: BoardIndex[] = [0 as BoardIndex, 16 as BoardIndex];
        const legalMovesStore = createMockLegalMovesStore();
        const movePiece = vi.fn();

        const { result } = await renderUseChessBoard({
            board,
            playerTurn: 'white',
            previousMoveIndices,
            legalMovesStore,
            checkedColor: 'black',
            movePiece,
        });

        expect(result.current.board).toBe(board);
        expect(result.current.playerTurn).toBe('white');
        expect(result.current.previousMoveIndices).toEqual(previousMoveIndices);
        expect(result.current.legalMovesStore).toBe(legalMovesStore);
        expect(result.current.pendingPromotion).toBeNull();
        expect(result.current.checkedColor).toBe('black');
        expect(result.current.boardIsFlipped).toBe(false);
        expect(result.current.boardInteractionIsDisabled).toBe(false);
        expect(result.current.movePiece).toBe(movePiece);
    });

    it('flips the board for black players viewing the game', async () => {
        const { result } = await renderUseChessBoard({
            playerTurn: 'black',
            currentPlayerColor: 'black',
        });

        expect(result.current.boardIsFlipped).toBe(true);
        expect(result.current.boardInteractionIsDisabled).toBe(false);
    });

    describe('boardInteractionIsDisabled', () => {
        const pendingPromotion: PendingPromotion = {
            move: createMockMove(),
            preChessGame: createMockChessGame(),
            prePreviousMoveIndices: [0 as BoardIndex],
        };

        const scenarios: Array<{
            scenario: string;
            options: RenderUseChessBoardOptions;
            expectedDisabled: boolean;
        }> = [
            {
                scenario: 'a pawn promotion is awaiting a choice',
                options: { pendingPromotion },
                expectedDisabled: true,
            },
            {
                scenario: 'the game has finished',
                options: { gameStatus: 'checkmate' },
                expectedDisabled: true,
            },
            {
                scenario: 'it is currently the opponent turn in a multiplayer room',
                options: { playerTurn: 'black', currentPlayerColor: 'white' },
                expectedDisabled: true,
            },
            {
                scenario: 'a self-play room ignores turn mismatch to allow testing lines',
                options: { playerTurn: 'black', currentPlayerColor: 'white', roomType: 'self' },
                expectedDisabled: false,
            },
        ];

        it.each(scenarios)('returns correct state when $scenario', async ({ options, expectedDisabled }) => {
            const { result } = await renderUseChessBoard(options);

            expect(result.current.boardInteractionIsDisabled).toBe(expectedDisabled);
            if (options.pendingPromotion) {
                expect(result.current.pendingPromotion).toBe(options.pendingPromotion);
            }
        });
    });
});
