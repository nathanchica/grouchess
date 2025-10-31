import { useEffect, useRef, useState } from 'react';

import type { TimeControl } from '@grouchess/game-room';

import Spinner from '../common/Spinner';
import GameRoomForm from '../mainmenu/GameRoomForm';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
const HEALTH_ENDPOINT = apiBaseUrl ? `${apiBaseUrl}/health/heartbeat` : null;
const POLL_INTERVAL_MS = 3000;
const REQUEST_TIMEOUT_MS = 5000;
const MAX_WAIT_MS = 60_000; // stop retrying after ~60 seconds

type Props = {
    onSelfPlayStart: (timeControl: TimeControl | null) => void;
};

/**
 * Polls the backend health endpoint until it becomes available.
 * While waiting, shows a friendly loading panel. Once healthy, renders the GameRoomForm.
 */
function ServiceHealthCheckView({ onSelfPlayStart }: Props) {
    const [isHealthy, setIsHealthy] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(Date.now());

    useEffect(() => {
        let isMounted = true;

        if (!HEALTH_ENDPOINT) {
            // If no endpoint is configured, we can't check health.
            setError('API base URL is not configured.');
            return () => {
                isMounted = false;
            };
        }

        const checkHealth = async () => {
            if (!isMounted) return;

            const controller = new AbortController();
            const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
            try {
                const response = await fetch(HEALTH_ENDPOINT, { signal: controller.signal });
                if (response.ok) {
                    if (!isMounted) return;
                    setIsHealthy(true);
                    setError(null);
                    if (intervalRef.current) {
                        window.clearInterval(intervalRef.current);
                        intervalRef.current = null;
                    }
                    return;
                }
                throw new Error(`Health check failed with status ${response.status}`);
            } catch {
                if (!isMounted) return;

                // Keep polling until the max wait time has elapsed
                setIsHealthy(false);
                const elapsed = Date.now() - startTimeRef.current;
                if (elapsed >= MAX_WAIT_MS) {
                    setError('The service may be down. Please try again later.');
                    if (intervalRef.current) {
                        window.clearInterval(intervalRef.current);
                        intervalRef.current = null;
                    }
                } else {
                    setError(null);
                }
            } finally {
                window.clearTimeout(timeoutId);
            }
        };

        // Initial check immediately
        startTimeRef.current = Date.now();
        checkHealth();

        // Continue polling until healthy
        intervalRef.current = window.setInterval(checkHealth, POLL_INTERVAL_MS);

        return () => {
            isMounted = false;
            if (intervalRef.current) {
                window.clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, []);

    if (isHealthy) {
        return <GameRoomForm onSelfPlayStart={onSelfPlayStart} />;
    }

    if (error) {
        return (
            <div className="flex-1 flex items-center">
                <section className="flex w-full max-w-3xl flex-col items-center gap-4 rounded-3xl border border-red-800/60 bg-red-950/40 p-24 text-center shadow-2xl shadow-black/30">
                    <h2 className="text-xl font-semibold text-red-200 sm:text-2xl">Service unavailable</h2>
                    <p className="text-sm text-red-300">{error}</p>
                </section>
            </div>
        );
    }

    return (
        <div className="flex-1 flex items-center">
            <section className="flex w-full max-w-3xl flex-col items-center gap-4 rounded-3xl border border-zinc-800 bg-zinc-950/60 p-24 text-center shadow-2xl shadow-black/30">
                <div className="flex items-center gap-3">
                    <Spinner size="lg" />
                    <h2 className="text-xl font-semibold text-zinc-100 sm:text-2xl">Waking up the server...</h2>
                </div>
                <p className="text-sm text-zinc-400">
                    Please wait, the server is waking up from sleep. This can take up to ~60 seconds.
                </p>
            </section>
        </div>
    );
}

export default ServiceHealthCheckView;
