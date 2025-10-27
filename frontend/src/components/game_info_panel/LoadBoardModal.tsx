import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';

import { isValidFEN } from '@grouchess/chess';

import DismissIcon from '../../assets/icons/xmark.svg?react';
import { useDismissOnEscape } from '../../hooks/useDismissOnEscape';
import { useChessGame } from '../../providers/ChessGameProvider';
import InfoCard from '../common/InfoCard';

type Props = {
    onDismiss: () => void;
};

function LoadFENModal({ onDismiss }: Props) {
    const { loadFEN } = useChessGame();
    useDismissOnEscape(onDismiss);

    const [fenInput, setFenInput] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const validate = useCallback((value: string) => {
        const fen = value.trim();
        if (fen.length === 0) {
            setErrorMessage(null);
            return false;
        }
        const isValid = isValidFEN(fen);
        setErrorMessage(isValid ? null : 'Invalid FEN');
        return isValid;
    }, []);

    const onChange = (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setFenInput(value);
        validate(value);
    };

    const canLoad = useMemo(() => fenInput.trim().length > 0 && !errorMessage, [fenInput, errorMessage]);

    const handleLoad = () => {
        if (!canLoad) return;
        loadFEN(fenInput.trim());
        onDismiss();
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        handleLoad();
    };

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    return (
        <div
            id="load-fen-modal"
            aria-labelledby="load-fen-modal-title"
            className="fixed inset-0 z-30 grid place-items-center"
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
        >
            <div className="fixed inset-0 bg-black/40 z-10" onClick={onDismiss} aria-hidden="true" />
            <div className="relative z-20">
                <InfoCard className="w-[min(90vw,32rem)]">
                    <form className="px-6 pt-4 pb-6" onSubmit={handleSubmit}>
                        <section className="flex justify-between items-baseline mb-6">
                            <h2 id="load-fen-modal-title" className="text-lg text-slate-50 font-semibold">
                                Load Board
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

                        <label htmlFor="fen-input" className="block text-slate-50 mb-1">
                            FEN
                        </label>
                        <input
                            id="fen-input"
                            ref={inputRef}
                            type="text"
                            autoComplete="off"
                            value={fenInput}
                            onChange={onChange}
                            placeholder="e.g. rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                            className="text-slate-100 pr-2 p-2 border border-slate-500 hover:border-slate-400 rounded w-full bg-zinc-700"
                            aria-invalid={!!errorMessage}
                            aria-describedby={errorMessage ? 'fen-error' : undefined}
                        />
                        {errorMessage && (
                            <p id="fen-error" className="mt-2 text-sm text-red-400">
                                {errorMessage}
                            </p>
                        )}

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onDismiss}
                                className="px-4 py-2 rounded border cursor-pointer border-slate-500 text-slate-200 hover:border-slate-400"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!canLoad}
                                className="px-4 py-2 rounded bg-emerald-700 text-white cursor-pointer hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Load
                            </button>
                        </div>
                    </form>
                </InfoCard>
            </div>
        </div>
    );
}

export default LoadFENModal;
