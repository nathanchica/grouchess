import { use, useState } from 'react';

import { type GetTimeControlOptionsResponse, GetTimeControlOptionsResponseSchema } from '@grouchess/http-schemas';
import type { TimeControl } from '@grouchess/models';

import TimeControlOption from './TimeControlOption';

import { getEnv } from '../../../utils/config';
import { getCachedPromise, fetchWithSchemasOrThrow } from '../../../utils/fetch';

async function fetchTimeControlOptions(): Promise<GetTimeControlOptionsResponse> {
    const url = `${getEnv().VITE_API_BASE_URL}/time-control`;
    return fetchWithSchemasOrThrow(url, {
        successSchema: GetTimeControlOptionsResponseSchema,
        errorMessage: 'Failed to fetch time control options.',
    });
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
            <div className="flex flex-col gap-8">
                <div className="grid gap-3 grid-cols-3">
                    {supportedTimeControls.map((timeControl) => {
                        const isSelected = timeControl.alias === selectedTimeControlAlias;

                        return (
                            <TimeControlOption
                                key={timeControl.alias}
                                isSelected={isSelected}
                                onSelect={() => handleSelectionChange(timeControl.alias)}
                                ariaLabel={`${timeControl.displayText} time control option`}
                                displayText={timeControl.displayText}
                                optionValue={timeControl.alias}
                            />
                        );
                    })}
                </div>

                <TimeControlOption
                    isSelected={isUnlimitedOptionSelected}
                    onSelect={() => handleSelectionChange(null)}
                    ariaLabel="Unlimited time control option"
                    displayText="Unlimited"
                    optionValue="unlimited"
                />
            </div>
        </fieldset>
    );
}

export default TimeControlOptions;
