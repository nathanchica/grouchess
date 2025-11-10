import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';

import { isValidFEN } from '@grouchess/chess';

import { useChessGame } from '../../../providers/ChessGameRoomProvider';

export type LoadBoardViewProps = {
    onDismiss: () => void;
};

function LoadBoardView({ onDismiss }: LoadBoardViewProps) {
    const { loadFEN } = useChessGame();

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
        <form className="w-full flex flex-col gap-6" onSubmit={handleSubmit}>
            <h2 id="load-fen-modal-title" className="text-lg text-slate-50 font-semibold">
                Load Board
            </h2>

            <div>
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
                    aria-invalid={Boolean(errorMessage)}
                    aria-describedby={errorMessage ? 'fen-error' : undefined}
                />
                {errorMessage && (
                    <p id="fen-error" role="alert" className="mt-2 text-sm text-red-400">
                        {errorMessage}
                    </p>
                )}
            </div>

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={!canLoad}
                    className="px-4 py-2 rounded bg-emerald-700 text-white cursor-pointer hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Load
                </button>
            </div>
        </form>
    );
}

export default LoadBoardView;
