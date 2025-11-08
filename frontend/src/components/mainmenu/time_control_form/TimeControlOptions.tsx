import { use, useState } from 'react';

import { type GetTimeControlOptionsResponse, GetTimeControlOptionsResponseSchema } from '@grouchess/http-schemas';
import type { TimeControl } from '@grouchess/models';

import { getCachedPromise } from '../../../utils/fetch';

async function fetchTimeControlOptions(): Promise<GetTimeControlOptionsResponse> {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

    if (!apiBaseUrl) {
        throw new Error('API base endpoint is not configured.');
    }

    const response = await fetch(`${apiBaseUrl}/time-control`);

    if (!response.ok) {
        throw new Error('Failed to fetch time control options.');
    }

    const data = await response.json();
    const parsedData = GetTimeControlOptionsResponseSchema.safeParse(data);

    if (!parsedData.success) {
        throw new Error('Failed to parse time control options.');
    }

    return parsedData.data;
}

type Props = {
    onTimeControlSelect: (timeControl: TimeControl | null) => void;
};

function TimeControlOptions({ onTimeControlSelect }: Props) {
    const { supportedTimeControls } = use(getCachedPromise(`getTimeControlOptions`, fetchTimeControlOptions));
    const [selectedTimeControlAlias, setSelectedTimeControlAlias] = useState<string | null>(null);

    const isUnlimitedOptionSelected = selectedTimeControlAlias === null;

    const timeControlOptionsByAlias = supportedTimeControls.reduce<Record<string, TimeControl>>(
        (result, timeControl) => {
            result[timeControl.alias] = timeControl;
            return result;
        },
        {}
    );

    const handleSelectionChange = (alias: string | null) => {
        setSelectedTimeControlAlias(alias);
        onTimeControlSelect(alias ? timeControlOptionsByAlias[alias] : null);
    };

    return (
        <fieldset>
            <legend className="sr-only">Time control options</legend>
            <section className="flex flex-col gap-8">
                <div className="grid gap-3 grid-cols-3">
                    {supportedTimeControls.map((timeControl) => {
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
                                <span className="text-base font-semibold text-zinc-100">{timeControl.displayText}</span>
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
    );
}

export default TimeControlOptions;
