import { useEffect, useState } from 'react';

import { ServiceUnavailableError } from '@grouchess/errors';
import type { TimeControl } from '@grouchess/game-room';

import { useFetchServiceHealth } from '../../hooks/useFetchServiceHealth';
import Spinner from '../common/Spinner';
import GameRoomForm from '../mainmenu/GameRoomForm';


const REQUEST_TIMEOUT_MS = 5000;
const MAX_ATTEMPTS = 12; // ~12 attempts with 5s timeout for 60s total
const MAX_WAIT_SECS = (MAX_ATTEMPTS * REQUEST_TIMEOUT_MS) / 1000;

type Props = {
    onSelfPlayStart: (timeControl: TimeControl | null) => void;
};

/**
 * Polls the backend health endpoint until it becomes available.
 * While waiting, shows a friendly loading panel. Once healthy, renders the GameRoomForm.
 */
function ServiceHealthCheckView({ onSelfPlayStart }: Props) {
    const { fetchHealthStatus } = useFetchServiceHealth();

    const [isHealthy, setIsHealthy] = useState<boolean>(false);
    const [attemptCount, setAttemptCount] = useState<number>(0);

    /**
     * Effect to poll the health endpoint at regular intervals until healthy or max wait time exceeded.
     */
    useEffect(() => {
        if (isHealthy) return;
        if (attemptCount >= MAX_ATTEMPTS) {
            throw new ServiceUnavailableError();
        }

        fetchHealthStatus({
            timeoutMs: REQUEST_TIMEOUT_MS,
            onSuccess: () => {
                setIsHealthy(true);
            },
            onError: () => {
                if (isHealthy) return;

                setIsHealthy(false);
                setAttemptCount((count) => count + 1);
            },
        });
    }, [fetchHealthStatus, isHealthy, attemptCount]);

    if (isHealthy) {
        return <GameRoomForm onSelfPlayStart={onSelfPlayStart} />;
    }

    return (
        <div className="flex-1 flex items-center">
            <section className="flex w-full max-w-3xl flex-col items-center gap-4 rounded-3xl border border-zinc-800 bg-zinc-950/60 pb-18 px-18 text-center shadow-2xl shadow-black/30">
                <img src="/gifs/gatito_dormirx3.gif" alt="Sleeping cat" className="size-64 select-none" />

                <div className="flex items-center gap-3">
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
