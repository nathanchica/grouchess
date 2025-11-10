import { useEffect, useRef } from 'react';

import { returnToMainMenu } from '../../../utils/window';

export type ExitGameViewProps = {
    onDismiss: () => void;
};

function ExitGameView({ onDismiss }: ExitGameViewProps) {
    const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        confirmButtonRef.current?.focus();
    }, []);

    return (
        <div className="w-full flex flex-col items-center gap-6 pt-8">
            <h2 className="text-lg text-slate-50 font-semibold">Are you sure you want to quit?</h2>

            <div className="flex justify-center gap-4 w-full">
                <button
                    ref={confirmButtonRef}
                    type="button"
                    onClick={returnToMainMenu}
                    className="px-4 py-2 rounded bg-emerald-700 text-white cursor-pointer hover:bg-emerald-600"
                >
                    Yes
                </button>
                <button
                    type="button"
                    onClick={onDismiss}
                    className="px-4 py-2 rounded border cursor-pointer border-slate-500 text-slate-200 hover:border-slate-400"
                >
                    No
                </button>
            </div>
        </div>
    );
}

export default ExitGameView;
