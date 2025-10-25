import { useCallback, useEffect, useRef, useState } from 'react';

import CopyIcon from '../../assets/icons/copy.svg?react';

type Props = {
    text: string;
    label: string;
    id: string;
    copyButtonAriaLabel: string;
};

function CopyableTextField({ text, label, id, copyButtonAriaLabel }: Props) {
    const [copied, setCopied] = useState(false);
    const timerRef = useRef<number | null>(null);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            if (timerRef.current) {
                window.clearTimeout(timerRef.current);
            }
            timerRef.current = window.setTimeout(() => setCopied(false), 2000);
        } catch {
            // no-op if clipboard is unavailable
        }
    }, [text]);

    /**
     * Clear timeout on unmount
     */
    useEffect(() => {
        return () => {
            if (timerRef.current) window.clearTimeout(timerRef.current);
        };
    }, []);

    return (
        <div>
            <label htmlFor={id} className="block text-slate-50 mb-1">
                {label}
            </label>
            <div className="relative">
                <input
                    id={id}
                    type="text"
                    readOnly
                    value={text}
                    onFocus={(event) => event.currentTarget.select()}
                    className="text-slate-100 cursor-default pr-10 p-2 border border-slate-500 hover:border-slate-400 rounded w-full bg-zinc-700"
                />
                <button
                    type="button"
                    onClick={handleCopy}
                    aria-label={copyButtonAriaLabel}
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
    );
}

export default CopyableTextField;
