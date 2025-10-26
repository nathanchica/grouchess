import { useState } from 'react';

import type { PieceColor } from '@grouchess/chess';

const OPTIONS = [
    { label: 'White', value: 'white' },
    { label: 'Black', value: 'black' },
    { label: 'Random Side', value: 'random' },
];
const DEFAULT_OPTION = OPTIONS[0].value;

type Props = {
    onSideSelect: (side: PieceColor | null) => void;
};

function SideSelectForm({ onSideSelect }: Props) {
    const [selectedSide, setSelectedSide] = useState<string | null>(DEFAULT_OPTION);

    const handleSideSelect = (side: string | null) => {
        setSelectedSide(side);
        onSideSelect(side === 'white' || side === 'black' ? side : null);
    };

    return (
        <div>
            <h2 className="text-lg sm:text-xl font-semibold text-zinc-100">Play as</h2>

            <form className="flex flex-row gap-2 mt-6">
                {OPTIONS.map(({ label, value }) => {
                    const isActive = selectedSide === value;
                    return (
                        <label
                            key={value}
                            className={`cursor-pointer gap-1 rounded-2xl border px-5 py-4 transition focus-within:outline focus-within:outline-offset-2 focus-within:outline-emerald-400 ${
                                isActive
                                    ? 'border-emerald-400 bg-emerald-400/10'
                                    : 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-300/60 hover:bg-emerald-400/10'
                            }`}
                        >
                            <input
                                type="radio"
                                name="side-select"
                                value={value}
                                checked={isActive}
                                onChange={() => handleSideSelect(value)}
                                className="sr-only"
                            />
                            <span className="text-base font-semibold text-zinc-100">{label}</span>
                        </label>
                    );
                })}
            </form>
        </div>
    );
}

export default SideSelectForm;
