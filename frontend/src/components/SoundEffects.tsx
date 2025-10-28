import { useEffect, useRef } from 'react';

import { isDrawStatus, type ChessGameStatus } from '@grouchess/chess';
import invariant from 'tiny-invariant';

import { useChessGame } from '../providers/ChessGameRoomProvider';
import { useSound, type SoundName } from '../providers/SoundProvider';

const CHECK_DELAY_MS = 120;

const getMoveSoundName = (san: string, isCapture: boolean): SoundName => {
    if (isCapture) return 'capture';
    if (san.startsWith('O-O')) return 'castle';
    if (san.includes('=')) return 'promote';
    return 'move';
};

const getGameEndSoundName = (status: ChessGameStatus, winner?: 'white' | 'black'): SoundName | null => {
    if (status === 'checkmate' || status === 'resigned' || status === 'time-out') {
        invariant(winner, 'Winner must be defined for checkmate, resignation, or time-out');
        return winner === 'white' ? 'victory' : 'defeat';
    }

    if (isDrawStatus(status)) {
        return 'draw';
    }

    return null;
};

function SoundEffects() {
    const { chessGame } = useChessGame();
    invariant(chessGame, 'chessGame is required for SoundEffects component');

    const { moveHistory, captures, gameState } = chessGame;
    const { status, winner } = gameState;
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
            const { san } = lastMove?.notation ?? { san: '' };
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
