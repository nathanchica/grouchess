import { useCallback, useEffect } from 'react';

import { useFetchWithRetry } from '../../hooks/useFetchWithRetry';
import { getEnv } from '../../utils/config';
import { MS_IN_SECOND } from '../../utils/formatting';
import { fetchParsedHealthStatus } from '../../utils/health';
import Plural from '../common/Plural';
import Spinner from '../common/Spinner';

type Props = {
    onHealthy: () => void;
};

/**
 * Polls the backend health endpoint until it becomes available.
 * While waiting, shows a friendly loading panel. Once healthy, calls onHealthy callback.
 */
function ServiceHealthCheckView({ onHealthy }: Props) {
    const {
        VITE_SERVICE_HEALTH_CHECK_REQUEST_TIMEOUT_MS: requestTimeoutMs,
        VITE_SERVICE_HEALTH_CHECK_MAX_TIMEOUT_ERROR_COUNT: maxTimeoutErrorCount,
        VITE_SERVICE_HEALTH_CHECK_MAX_NON_TIMEOUT_ERROR_COUNT: maxNonTimeoutErrorCount,
    } = getEnv();

    const maxWaitSecs = (maxTimeoutErrorCount * requestTimeoutMs) / MS_IN_SECOND;

    const fetchHealth = useCallback(() => fetchParsedHealthStatus({ timeoutMs: requestTimeoutMs }), [requestTimeoutMs]);

    const { isSuccess } = useFetchWithRetry({
        fetchFunction: fetchHealth,
        maxTimeoutErrorCount,
        maxNonTimeoutErrorCount,
    });

    // Notify parent when healthy so it can switch views
    useEffect(() => {
        if (isSuccess) {
            onHealthy();
        }
    }, [isSuccess, onHealthy]);

    if (isSuccess) return null;

    return (
        <div className="flex-1 flex items-center">
            <section className="flex w-full max-w-3xl flex-col items-center gap-4 rounded-3xl border border-zinc-800 bg-zinc-950/60 pb-18 px-18 text-center shadow-2xl shadow-black/30">
                <img src="/gifs/gatito_dormirx3.gif" alt="Sleeping cat" className="size-64 select-none" />

                <div role="status" className="flex items-center gap-3">
                    <Spinner size="lg" />
                    <h2 className="text-xl font-semibold text-zinc-100 sm:text-2xl">Waking up the server...</h2>
                </div>

                <p className="text-sm text-zinc-400">
                    Please wait, the server is waking up from sleep. This can take up to ~{maxWaitSecs}{' '}
                    <Plural value={maxWaitSecs} one="second" many="seconds" />.
                </p>
            </section>
        </div>
    );
}

export default ServiceHealthCheckView;
