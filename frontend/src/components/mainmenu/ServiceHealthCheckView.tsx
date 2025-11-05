import { useEffect, useState } from 'react';

import { RequestTimeoutError, ServiceUnavailableError } from '@grouchess/errors';

import { useFetchServiceHealth } from '../../hooks/useFetchServiceHealth';
import Spinner from '../common/Spinner';

const REQUEST_TIMEOUT_MS = 5000;
const MAX_TIMEOUT_ERROR_COUNT = 12; // ~12 attempts with 5s timeout for 60s total
const MAX_WAIT_SECS = (MAX_TIMEOUT_ERROR_COUNT * REQUEST_TIMEOUT_MS) / 1000;
const MAX_NON_TIMEOUT_ERROR_COUNT = 3; // Fail fast on non-timeout errors

type Props = {
    onHealthy: () => void;
};

/**
 * Polls the backend health endpoint until it becomes available.
 * While waiting, shows a friendly loading panel. Once healthy, calls onHealthy callback.
 */
function ServiceHealthCheckView({ onHealthy }: Props) {
    const { fetchHealthStatus, error } = useFetchServiceHealth();

    const [isHealthy, setIsHealthy] = useState<boolean>(false);
    const [timeoutErrorCount, setTimeoutErrorCount] = useState<number>(0);
    const [nonTimeoutErrorCount, setNonTimeoutErrorCount] = useState<number>(0);

    if (timeoutErrorCount >= MAX_TIMEOUT_ERROR_COUNT) {
        throw new ServiceUnavailableError();
    }

    if (
        error != null &&
        !(error instanceof RequestTimeoutError) &&
        nonTimeoutErrorCount >= MAX_NON_TIMEOUT_ERROR_COUNT
    ) {
        throw error;
    }

    /**
     * Fetch health status on mount and whenever timeoutErrorCount or nonTimeoutErrorCount changes.
     */
    useEffect(() => {
        if (isHealthy) return;

        fetchHealthStatus({
            timeoutMs: REQUEST_TIMEOUT_MS,
            onSuccess: () => {
                setIsHealthy(true);
            },
            onError: (error) => {
                if (isHealthy) return;
                if (error instanceof RequestTimeoutError) {
                    setTimeoutErrorCount((count) => count + 1);
                    return;
                }
                setNonTimeoutErrorCount((count) => count + 1);
            },
        });
    }, [fetchHealthStatus, isHealthy, timeoutErrorCount, nonTimeoutErrorCount]);

    // Notify parent when healthy so it can switch views
    useEffect(() => {
        if (isHealthy) {
            onHealthy();
        }
    }, [isHealthy, onHealthy]);

    if (isHealthy) return null;

    return (
        <div className="flex-1 flex items-center">
            <section className="flex w-full max-w-3xl flex-col items-center gap-4 rounded-3xl border border-zinc-800 bg-zinc-950/60 pb-18 px-18 text-center shadow-2xl shadow-black/30">
                <img src="/gifs/gatito_dormirx3.gif" alt="Sleeping cat" className="size-64 select-none" />

                <div role="status" className="flex items-center gap-3">
                    <Spinner size="lg" />
                    <h2 className="text-xl font-semibold text-zinc-100 sm:text-2xl">Waking up the server...</h2>
                </div>

                <p className="text-sm text-zinc-400">
                    Please wait, the server is waking up from sleep. This can take up to ~{MAX_WAIT_SECS} seconds.
                </p>
            </section>
        </div>
    );
}

export default ServiceHealthCheckView;
