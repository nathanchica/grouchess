import type { PieceColor } from '@grouchess/chess';
import invariant from 'tiny-invariant';

import { useChessClock } from '../providers/ChessGameRoomProvider';
import { useClockTick } from '../providers/ClockTickProvider';

const MS_IN_SECOND = 1000;
const SEC_IN_MINUTE = 60;
const SHOW_MS_THRESHOLD_SECONDS = 20;

type Props = {
    isActive: boolean;
    color: PieceColor;
};

function parseTime(ms: number): { minutes: number; seconds: number; milliseconds: number } {
    const totalSeconds = Math.floor(ms / MS_IN_SECOND);
    const minutes = Math.floor(totalSeconds / SEC_IN_MINUTE);
    const seconds = totalSeconds % SEC_IN_MINUTE;
    const milliseconds = ms % MS_IN_SECOND;

    return { minutes, seconds, milliseconds };
}

function formatMinutesAndSeconds(minutes: number, seconds: number): string {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatMsPart(ms: number): string {
    return Math.floor(ms / 10)
        .toString()
        .padStart(2, '0');
}

function ChessClock({ isActive, color }: Props) {
    const { nowMs } = useClockTick();
    const { clockState } = useChessClock();
    invariant(clockState, 'ChessClock requires non-null clockState');

    const { isPaused } = clockState;
    const { timeRemainingMs } = clockState[color];

    const elapsedActiveMs =
        isActive && !isPaused && clockState.lastUpdatedTimeMs !== null
            ? Math.max(0, nowMs - clockState.lastUpdatedTimeMs)
            : 0;
    const timeToDisplayMs = isActive && !isPaused ? timeRemainingMs - elapsedActiveMs : timeRemainingMs;
    const { minutes, seconds, milliseconds } = parseTime(Math.max(timeToDisplayMs, 0));

    const showMsPart = minutes === 0 && seconds <= SHOW_MS_THRESHOLD_SECONDS;
    const minAndSecText = formatMinutesAndSeconds(minutes, seconds);
    const msPartText = showMsPart ? formatMsPart(milliseconds) : '00';

    return (
        <time
            className={`col-span-3 cursor-default text-zinc-300 text-right pr-2 text-2xl font-bold tabular-nums tracking-widest py-1 rounded-lg ${isActive && 'bg-zinc-600'}`}
            aria-live="polite"
            aria-label={`${color} clock: ${minAndSecText}${msPartText} remaining`}
        >
            {minAndSecText}
            <span className={`text-base ${!showMsPart && 'invisible'}`}>
                .<span className="inline-block w-[2ch]">{msPartText}</span>
            </span>
        </time>
    );
}

export default ChessClock;
