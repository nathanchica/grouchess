import type { ChessClockContextType, ChessGameContextType, GameRoomContextType } from '../ChessGameRoomProvider';

export function createMockChessClockContextValues(overrides?: Partial<ChessClockContextType>): ChessClockContextType {
    return {
        clockState: null,
        setClocks: () => {},
        resetClocks: () => {},
        ...overrides,
    };
}

export function createMockChessGameContextValues(overrides?: Partial<ChessGameContextType>): ChessGameContextType {
    return {
        chessGame: {
            boardState: {
                board: [],
                playerTurn: 'white',
                halfmoveClock: 0,
                fullmoveClock: 1,
                enPassantTargetIndex: null,
                castleRightsByColor: {
                    white: {
                        short: true,
                        long: true,
                    },
                    black: {
                        short: true,
                        long: true,
                    },
                },
            },
            legalMovesStore: {
                allMoves: [],
                byStartIndex: {},
                typeAndEndIndexToStartIndex: {},
            },
            moveHistory: [],
            captures: [],
            gameState: {
                status: 'in-progress',
            },
            positionCounts: {},
            previousMoveIndices: [],
            timelineVersion: 0,
            pendingPromotion: null,
        },
        movePiece: () => {},
        promotePawn: () => {},
        cancelPromotion: () => {},
        loadFEN: () => {},
        endGame: () => {},
        ...overrides,
    };
}

export function createMockGameRoomContextValues(overrides?: Partial<GameRoomContextType>): GameRoomContextType {
    return {
        gameRoom: {
            id: '',
            players: [],
            colorToPlayerId: {
                white: '',
                black: '',
            },
            timeControl: null,
            type: 'self',
            playerIdToDisplayName: {},
            playerIdToScore: {},
            gameCount: 0,
        },
        currentPlayerId: '',
        currentPlayerColor: 'white',
        loadRoom: () => {},
        loadCurrentPlayerId: () => {},
        startSelfPlayRoom: () => {},
        ...overrides,
    };
}
