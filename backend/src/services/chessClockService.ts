import { updateClockState, type ChessClockState, type PieceColor } from '@grouchess/chess';
import type { TimeControl } from '@grouchess/game-room';

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;

export class ChessClockService {
    private gameRoomIdToClockStateMap: Map<string, ChessClockState> = new Map();

    initializeClockForRoom(roomId: string, timeControl: TimeControl): ChessClockState {
        const baseTimeMs = timeControl.minutes * MS_PER_MINUTE;
        const initialState: ChessClockState = {
            white: {
                timeRemainingMs: baseTimeMs,
                isActive: false,
            },
            black: {
                timeRemainingMs: baseTimeMs,
                isActive: false,
            },
            lastUpdatedTimeMs: null,
            baseTimeMs,
            incrementMs: timeControl.increment * MS_PER_SECOND,
            isPaused: true,
        };
        this.gameRoomIdToClockStateMap.set(roomId, initialState);
        return initialState;
    }

    getClockStateForRoom(roomId: string): ChessClockState | null {
        const clockState = this.gameRoomIdToClockStateMap.get(roomId);
        if (!clockState) {
            return null;
        }
        const updatedClockState = updateClockState(clockState, Date.now());
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

        const updatedClockState = updateClockState(clockState, Date.now(), toColor);
        this.gameRoomIdToClockStateMap.set(roomId, updatedClockState);
        return updatedClockState;
    }

    checkTimeExpired(roomId: string): PieceColor | null {
        const clockState = this.getClockStateForRoom(roomId);
        if (!clockState) {
            throw new Error('Clock not initialized for this room');
        }

        this.gameRoomIdToClockStateMap.set(roomId, clockState);

        if (clockState.white.timeRemainingMs <= 0) {
            return 'white';
        }
        if (clockState.black.timeRemainingMs <= 0) {
            return 'black';
        }
        return null;
    }

    pauseClock(roomId: string): ChessClockState {
        const clockState = this.getClockStateForRoom(roomId);
        if (!clockState) {
            throw new Error('Clock not initialized for this room');
        }

        clockState.isPaused = true;
        clockState.lastUpdatedTimeMs = null;

        this.gameRoomIdToClockStateMap.set(roomId, clockState);

        return clockState;
    }

    startClock(roomId: string, activeColor?: PieceColor): ChessClockState {
        const clockState = this.getClockStateForRoom(roomId);
        if (!clockState) {
            throw new Error('Clock not initialized for this room');
        }

        clockState.isPaused = false;
        clockState.lastUpdatedTimeMs = Date.now();

        if (activeColor) {
            clockState.white.isActive = activeColor === 'white';
            clockState.black.isActive = activeColor === 'black';
        }

        this.gameRoomIdToClockStateMap.set(roomId, clockState);

        return clockState;
    }

    resetClock(roomId: string): ChessClockState {
        const clockState = this.getClockStateForRoom(roomId);
        if (!clockState) {
            throw new Error('Clock not initialized for this room');
        }

        clockState.white.timeRemainingMs = clockState.baseTimeMs;
        clockState.black.timeRemainingMs = clockState.baseTimeMs;
        clockState.white.isActive = false;
        clockState.black.isActive = false;
        clockState.lastUpdatedTimeMs = null;
        clockState.isPaused = true;
        this.gameRoomIdToClockStateMap.set(roomId, clockState);

        return clockState;
    }
}
