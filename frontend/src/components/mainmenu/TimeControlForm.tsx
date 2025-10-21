import { useState } from 'react';

import { useFetchTimeControlOptions } from '../../hooks/useFetchTimeControlOptions';

const NUM_SHIMMERS = 6;

type Props = {
    onTimeControlSelect: (timeControlAlias: string | null) => void;
};

function TimeControlForm({ onTimeControlSelect }: Props) {
    const [selectedTimeControlAlias, setSelectedTimeControlAlias] = useState<string | null>(null);
    const {
        timeControlOptions,
        loading: isLoadingTimeControls,
        error: timeControlError,
    } = useFetchTimeControlOptions();

    const isUnlimitedOptionSelected = selectedTimeControlAlias === null;

    const handleSelectionChange = (alias: string | null) => {
        setSelectedTimeControlAlias(alias);
        onTimeControlSelect(alias);
    };

    return (
        <div>
            <h2 className="text-lg sm:text-xl font-semibold text-zinc-100">Time Control</h2>

            <div className="mt-6">
                {isLoadingTimeControls ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {Array.from({ length: NUM_SHIMMERS }).map((_, index) => (
                            <div
                                key={`time-control-shimmer-${index}`}
                                className="h-16 animate-pulse rounded-2xl bg-emerald-500/10"
                            />
                        ))}
                    </div>
                ) : timeControlError ? (
                    <p className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {timeControlError.message}
                    </p>
                ) : timeControlOptions.length === 0 ? (
                    <p className="text-sm text-emerald-100/70">No time controls available yet.</p>
                ) : (
                    <fieldset>
                        <legend className="sr-only">Time control options</legend>
                        <section className="flex flex-col gap-8">
                            <div className="grid gap-3 grid-cols-3">
                                {timeControlOptions.map((timeControl) => {
                                    const isSelected = timeControl.alias === selectedTimeControlAlias;

                                    return (
                                        <label
                                            key={timeControl.alias}
                                            className={`cursor-pointer gap-1 rounded-2xl border px-5 py-4 transition focus-within:outline focus-within:outline-offset-2 focus-within:outline-emerald-400 ${
                                                isSelected
                                                    ? 'border-emerald-400 bg-emerald-400/10'
                                                    : 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-300/60 hover:bg-emerald-400/10'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="time-control"
                                                value={timeControl.alias}
                                                checked={isSelected}
                                                onChange={() => handleSelectionChange(timeControl.alias)}
                                                className="sr-only"
                                            />
                                            <span className="text-base font-semibold text-zinc-100">
                                                {timeControl.displayText}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>

                            <label
                                className={`cursor-pointer gap-1 rounded-2xl border px-5 py-4 transition focus-within:outline focus-within:outline-offset-2 focus-within:outline-emerald-400 ${
                                    isUnlimitedOptionSelected
                                        ? 'border-emerald-400 bg-emerald-400/10'
                                        : 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-300/60 hover:bg-emerald-400/10'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="time-control"
                                    value="unlimited"
                                    checked={isUnlimitedOptionSelected}
                                    onChange={() => handleSelectionChange(null)}
                                    className="sr-only"
                                />
                                <span className="text-base font-semibold text-zinc-100">Unlimited</span>
                            </label>
                        </section>
                    </fieldset>
                )}
            </div>
        </div>
    );
}

export default TimeControlForm;
