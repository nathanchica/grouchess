import type { PieceColor } from '@grouchess/chess';
import {
    createInitialChessClockState,
    createUpdatedClockState,
    createPausedClockState,
    createStartedClockState,
    type ChessClockState,
} from '@grouchess/chess-clocks';
import type { TimeControl } from '@grouchess/game-room';

export class ChessClockService {
    private gameRoomIdToClockStateMap: Map<string, ChessClockState> = new Map();

    initializeClockForRoom(roomId: string, timeControl: TimeControl): ChessClockState {
        const initialState = createInitialChessClockState(timeControl);
        this.gameRoomIdToClockStateMap.set(roomId, initialState);
        return initialState;
    }

    hasClockForRoom(roomId: string): boolean {
        return this.gameRoomIdToClockStateMap.has(roomId);
    }

    getClockStateForRoom(roomId: string): ChessClockState | null {
        const clockState = this.gameRoomIdToClockStateMap.get(roomId);
        if (!clockState) {
            return null;
        }
        const updatedClockState = createUpdatedClockState(clockState, Date.now());
        this.gameRoomIdToClockStateMap.set(roomId, updatedClockState);
        return updatedClockState;
    }

    deleteClockForRoom(roomId: string): void {
        this.gameRoomIdToClockStateMap.delete(roomId);
    }

    switchClock(roomId: string, toColor: PieceColor): ChessClockState {
        const clockState = this.gameRoomIdToClockStateMap.get(roomId);
        if (!clockState) {
            throw new Error('Clock not initialized for this room');
        }

        if (clockState.isPaused) {
            throw new Error('Cannot switch clock while paused');
        }

        const updatedClockState = createUpdatedClockState(clockState, Date.now(), toColor);
        this.gameRoomIdToClockStateMap.set(roomId, updatedClockState);
        return updatedClockState;
    }

    pauseClock(roomId: string): ChessClockState {
        const clockState = this.getClockStateForRoom(roomId);
        if (!clockState) {
            throw new Error('Clock not initialized for this room');
        }

        const pausedClockState = createPausedClockState(clockState);
        this.gameRoomIdToClockStateMap.set(roomId, pausedClockState);

        return pausedClockState;
    }

    startClock(roomId: string, activeColor: PieceColor, incrementColor?: PieceColor): ChessClockState {
        const clockState = this.getClockStateForRoom(roomId);
        if (!clockState) {
            throw new Error('Clock not initialized for this room');
        }

        const startedClockState = createStartedClockState(clockState, activeColor, Date.now(), incrementColor);
        this.gameRoomIdToClockStateMap.set(roomId, startedClockState);

        return startedClockState;
    }

    resetClock(roomId: string): ChessClockState {
        const clockState = this.getClockStateForRoom(roomId);
        if (!clockState) {
            throw new Error('Clock not initialized for this room');
        }

        const resetClockState: ChessClockState = {
            white: {
                timeRemainingMs: clockState.baseTimeMs,
                isActive: false,
            },
            black: {
                timeRemainingMs: clockState.baseTimeMs,
                isActive: false,
            },
            lastUpdatedTimeMs: null,
            baseTimeMs: clockState.baseTimeMs,
            incrementMs: clockState.incrementMs,
            isPaused: true,
        };
        this.gameRoomIdToClockStateMap.set(roomId, resetClockState);

        return resetClockState;
    }
}
