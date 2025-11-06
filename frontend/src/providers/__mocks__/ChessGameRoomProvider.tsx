import { createMockChessGame, createMockChessGameRoom } from '@grouchess/test-utils';

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
            ...createMockChessGame(),
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
        gameRoom: createMockChessGameRoom(),
        currentPlayerId: '',
        currentPlayerColor: 'white',
        loadRoom: () => {},
        loadCurrentPlayerId: () => {},
        startSelfPlayRoom: () => {},
        ...overrides,
    };
}
