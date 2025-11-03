import { lazy, use, useState } from 'react';

import type { TimeControl } from '@grouchess/game-room';

import GameRoomForm from './GameRoomForm';

import { checkHealthStatus } from '../../utils/health';

const LazyServiceHealthCheckView = lazy(() => import('./ServiceHealthCheckView'));

type Props = {
    onSelfPlayStart: (timeControl: TimeControl | null) => void;
};

/**
 * Represents the active health check probe promise.
 * This ensures that multiple mounts of the health gate share the same probe instead of creating multiple probes.
 */
let activeProbe: Promise<boolean> | null = null;

/**
 * Gates access to the GameRoomForm until the backend service is healthy
 */
function GameRoomFormHealthGate({ onSelfPlayStart }: Props) {
    const initiallyHealthy = use((activeProbe ??= checkHealthStatus()));
    const [isHealthy, setIsHealthy] = useState<boolean>(initiallyHealthy);

    if (isHealthy) {
        return <GameRoomForm onSelfPlayStart={onSelfPlayStart} />;
    }

    return <LazyServiceHealthCheckView onHealthy={() => setIsHealthy(true)} />;
}

export default GameRoomFormHealthGate;
