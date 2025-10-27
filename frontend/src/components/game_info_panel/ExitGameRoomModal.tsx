import { useEffect, useRef } from 'react';

import DismissIcon from '../../assets/icons/xmark.svg?react';
import { useDismissOnEscape } from '../../hooks/useDismissOnEscape';
import InfoCard from '../common/InfoCard';

type Props = {
    onDismiss: () => void;
};

function ExitGameRoomModal({ onDismiss }: Props) {
    const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
    useDismissOnEscape(onDismiss);

    useEffect(() => {
        confirmButtonRef.current?.focus();
    }, []);

    const onExitGame = () => {
        window.location.href = '/';
    };

    return (
        <div
            id="exit-game-room-modal"
            aria-labelledby="exit-game-room-modal-title"
            className="fixed inset-0 z-30 grid place-items-center"
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
        >
            <div className="fixed inset-0 bg-black/40 z-10" onClick={onDismiss} aria-hidden="true" />
            <div className="relative z-20">
                <InfoCard className="w-[min(90vw,24rem)]">
                    <div className="px-6 pt-4 pb-6">
                        <section className="flex justify-between items-baseline mb-6">
                            <h2 id="exit-game-room-modal-title" className="text-lg text-slate-50 font-semibold">
                                Exit
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

                        <p className="text-slate-100 mb-6">Are you sure you want to quit?</p>

                        <div className="flex justify-end gap-3">
                            <button
                                ref={confirmButtonRef}
                                type="button"
                                onClick={onExitGame}
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
                </InfoCard>
            </div>
        </div>
    );
}

export default ExitGameRoomModal;
