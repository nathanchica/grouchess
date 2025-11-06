import type { ChessClockState } from '@grouchess/models';

const MS_IN_SECOND = 1000;
const SEC_IN_MINUTE = 60;

// Convert a server-provided clock state's lastUpdatedTimeMs (epoch ms) to a
// client-side performance timer baseline so that UI can do: performance.now() - lastUpdatedPerfMs.
export function rebaseServerClockToPerf(clockState: ChessClockState): ChessClockState {
    const serverLast = clockState.lastUpdatedTimeMs;
    if (serverLast === null) return clockState;
    const nowEpoch = Date.now();
    const nowPerf = performance.now();
    const delta = Math.max(0, nowEpoch - serverLast);
    const lastUpdatedPerf = nowPerf - delta;
    return { ...clockState, lastUpdatedTimeMs: lastUpdatedPerf };
}

export function parseTime(ms: number): { minutes: number; seconds: number; milliseconds: number } {
    const totalSeconds = Math.floor(ms / MS_IN_SECOND);
    const minutes = Math.floor(totalSeconds / SEC_IN_MINUTE);
    const seconds = totalSeconds % SEC_IN_MINUTE;
    const milliseconds = ms % MS_IN_SECOND;

    return { minutes, seconds, milliseconds };
}

export function formatMinutesAndSeconds(minutes: number, seconds: number): string {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatMsPart(ms: number): string {
    return Math.floor(ms / 100).toString();
}
