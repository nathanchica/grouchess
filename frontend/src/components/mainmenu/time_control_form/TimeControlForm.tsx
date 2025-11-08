import { Suspense } from 'react';

import type { TimeControl } from '@grouchess/models';
import { ErrorBoundary } from 'react-error-boundary';

import ErrorView from './ErrorView';
import TimeControlOptions from './TimeControlOptions';
import TimeControlOptionsShimmer from './TimeControlOptionsShimmer';

type Props = {
    onTimeControlSelect: (timeControl: TimeControl | null) => void;
};

function TimeControlForm({ onTimeControlSelect }: Props) {
    return (
        <div>
            <h2 className="text-lg sm:text-xl font-semibold text-zinc-100">Time Control</h2>

            <div className="mt-6">
                <Suspense fallback={<TimeControlOptionsShimmer />}>
                    <ErrorBoundary fallbackRender={ErrorView}>
                        <TimeControlOptions onTimeControlSelect={onTimeControlSelect} />
                    </ErrorBoundary>
                </Suspense>
            </div>
        </div>
    );
}

export default TimeControlForm;
