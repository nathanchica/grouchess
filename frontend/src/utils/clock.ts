import type { ChessClockState } from '@grouchess/models';

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
