import type { PieceColor } from '@grouchess/models';
import invariant from 'tiny-invariant';

import StopwatchIcon from '../../assets/icons/stopwatch.svg?react';
import { useChessClock } from '../../providers/ChessGameRoomProvider';
import { useClockTick } from '../../providers/ClockTickProvider';

const MS_IN_SECOND = 1000;
const SEC_IN_MINUTE = 60;
const SHOW_MS_THRESHOLD_SECONDS = 10;

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
    return Math.floor(ms / 100).toString();
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

    const showMsPart = minutes === 0 && seconds < SHOW_MS_THRESHOLD_SECONDS;
    const minAndSecText = formatMinutesAndSeconds(minutes, seconds);
    const msPartText = showMsPart ? formatMsPart(milliseconds) : '0';

    return (
        <div
            className={`flex flex-row gap-3 justify-end items-center cursor-default text-zinc-300 text-2xl font-bold tabular-nums tracking-widest p-1 rounded-lg ${isActive && 'bg-zinc-600'}`}
        >
            {isActive && <StopwatchIcon className="inline-block size-5 text-zinc-300/80 ml-4" aria-hidden="true" />}
            <span
                role="timer"
                aria-live="polite"
                aria-label={`${color} clock: ${minAndSecText}${msPartText} remaining`}
            >
                {minAndSecText}
                <span className={`text-base ${!showMsPart && 'invisible'}`}>
                    .<span className="w-[1ch]">{msPartText}</span>
                </span>
            </span>
        </div>
    );
}

export default ChessClock;
