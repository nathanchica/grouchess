import { useEffect, useRef } from 'react';

import invariant from 'tiny-invariant';

import { useChessGame, type GameStatus } from '../providers/ChessGameProvider';
import { useSound, type SoundName } from '../providers/SoundProvider';

const CHECK_DELAY_MS = 120;

const DRAW_STATUSES: ReadonlySet<GameStatus['status']> = new Set<GameStatus['status']>([
    'stalemate',
    '50-move-draw',
    'threefold-repetition',
    'draw-by-agreement',
    'insufficient-material',
] as const);

const getMoveSoundName = (san: string, isCapture: boolean): SoundName => {
    if (isCapture) return 'capture';
    if (san.startsWith('O-O')) return 'castle';
    if (san.includes('=')) return 'promote';
    return 'move';
};

const getGameEndSoundName = (status: GameStatus['status'], winner?: 'white' | 'black'): SoundName | null => {
    if (status === 'checkmate' || status === 'resigned' || status === 'time-out') {
        invariant(winner, 'Winner must be defined for checkmate, resignation, or time-out');
        return winner === 'white' ? 'victory' : 'defeat';
    }

    if (DRAW_STATUSES.has(status)) {
        return 'draw';
    }

    return null;
};

function SoundEffects() {
    const { moveHistory, captures, gameStatus } = useChessGame();
    const { status, winner } = gameStatus;
    const { play } = useSound();

    const prevMoveCountRef = useRef<number>(moveHistory.length);
    const prevStatusRef = useRef<string>(status);
    const checkTimerRef = useRef<number | null>(null);

    useEffect(() => {
        const previousCount = prevMoveCountRef.current;
        const currentCount = moveHistory.length;

        if (currentCount === 0) {
            prevMoveCountRef.current = 0;
            return;
        }

        if (currentCount > previousCount) {
            const latestIndex = currentCount - 1;
            const lastMove = moveHistory[latestIndex];
            const san = lastMove?.algebraicNotation ?? '';
            const didCapture = captures.some(({ moveIndex }) => moveIndex === latestIndex);

            play(getMoveSoundName(san, didCapture));

            const endsWithCheck = san.endsWith('+');
            const endsWithMate = san.endsWith('#');

            if (endsWithCheck || endsWithMate) {
                if (checkTimerRef.current !== null) {
                    window.clearTimeout(checkTimerRef.current);
                }
                checkTimerRef.current = window.setTimeout(() => {
                    play('check');
                }, CHECK_DELAY_MS);
            }
        }

        prevMoveCountRef.current = currentCount;
    }, [captures, moveHistory, play]);

    useEffect(() => {
        const prevStatus = prevStatusRef.current;

        if (status !== prevStatus) {
            const sound = getGameEndSoundName(status, winner);
            if (sound) {
                play(sound);
            }
            prevStatusRef.current = status;
        }
    }, [play, status, winner]);

    useEffect(
        () => () => {
            if (checkTimerRef.current !== null) {
                window.clearTimeout(checkTimerRef.current);
            }
        },
        []
    );

    return null;
}

export default SoundEffects;
