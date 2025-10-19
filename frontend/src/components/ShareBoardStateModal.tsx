import { useCallback, useEffect, useRef, useState } from 'react';

import InfoCard from './InfoCard';

import CopyIcon from '../assets/icons/copy.svg?react';
import DismissIcon from '../assets/icons/xmark.svg?react';
import { useChessGame } from '../providers/ChessGameProvider';
import { createFEN } from '../utils/notations';

type Props = {
    onDismiss: () => void;
};

function ShareBoardStateModal({ onDismiss }: Props) {
    const { board, playerTurn, castleRightsByColor, enPassantTargetIndex, halfmoveClock, fullmoveClock } =
        useChessGame();

    const [copied, setCopied] = useState(false);
    const timerRef = useRef<number | null>(null);

    const fenString = createFEN(
        board,
        playerTurn,
        castleRightsByColor,
        enPassantTargetIndex,
        halfmoveClock,
        fullmoveClock
    );

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(fenString);
            setCopied(true);
            if (timerRef.current) {
                window.clearTimeout(timerRef.current);
            }
            timerRef.current = window.setTimeout(() => setCopied(false), 2000);
        } catch {
            // no-op if clipboard is unavailable
        }
    }, [fenString]);

    const handleKeyDownEvent = useCallback(
        (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onDismiss();
            }
        },
        [onDismiss]
    );

    /**
     * Handle Escape key to dismiss modal
     */
    useEffect(() => {
        document.addEventListener('keydown', handleKeyDownEvent);

        return () => {
            document.removeEventListener('keydown', handleKeyDownEvent);
        };
    }, [handleKeyDownEvent]);

    /**
     * Clear timeout on unmount
     */
    useEffect(() => {
        return () => {
            if (timerRef.current) window.clearTimeout(timerRef.current);
        };
    }, []);

    return (
        <div
            id="share-board-modal"
            aria-labelledby="share-board-modal-title"
            className="fixed inset-0 z-30 grid place-items-center"
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
        >
            <div className="fixed inset-0 bg-black/40 z-10" onClick={onDismiss} aria-hidden="true" />
            <div className="relative z-20">
                <InfoCard className="w-[min(90vw,32rem)]">
                    <div className="px-6 pt-4 pb-8">
                        <section className="flex justify-between items-baseline mb-6">
                            <h2 id="share-board-modal-title" className="text-lg text-slate-50 font-semibold">
                                Share
                            </h2>
                            <button
                                type="button"
                                onClick={onDismiss}
                                aria-label="Close"
                                className="text-slate-400 hover:text-slate-100 cursor-pointer"
                            >
                                <DismissIcon className="w-5 h-5" aria-hidden="true" />
                            </button>
                        </section>

                        <label htmlFor="fen-string" className="block text-slate-50 mb-1">
                            FEN
                        </label>
                        <div className="relative">
                            <input
                                id="fen-string"
                                type="text"
                                readOnly
                                value={fenString}
                                className="text-slate-100 cursor-default pr-10 p-2 border border-slate-500 hover:border-slate-400 rounded w-full bg-zinc-700"
                            />
                            <button
                                type="button"
                                onClick={handleCopy}
                                aria-label="Copy FEN"
                                className={`absolute inset-y-0 right-2 my-auto p-1 cursor-pointer transition-colors duration-300 ${copied ? 'text-emerald-300' : 'text-zinc-400 hover:text-zinc-100'}`}
                            >
                                <CopyIcon className="w-5 h-5" aria-hidden="true" />
                            </button>
                            <span
                                className={`pointer-events-none absolute right-2 -top-8 select-none rounded bg-zinc-900 px-2 py-1 text-xs text-zinc-100 shadow-md transition-all duration-300 ease-out ${copied ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
                                role="status"
                                aria-live={copied ? 'polite' : 'off'}
                                aria-hidden={!copied}
                            >
                                Copied!
                            </span>
                        </div>
                    </div>
                </InfoCard>
            </div>
        </div>
    );
}

export default ShareBoardStateModal;
