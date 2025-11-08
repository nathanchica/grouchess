import { lazy, use, useState } from 'react';

import type { TimeControl } from '@grouchess/models';

import GameRoomForm from './GameRoomForm';

import { getCachedPromise } from '../../utils/fetch';
import { checkHealthStatus } from '../../utils/health';

const LazyServiceHealthCheckView = lazy(() => import('./ServiceHealthCheckView'));

type Props = {
    onSelfPlayStart: (timeControl: TimeControl | null) => void;
};

/**
 * Gates access to the GameRoomForm until the backend service is healthy
 */
function GameRoomFormHealthGate({ onSelfPlayStart }: Props) {
    const initiallyHealthy = use(getCachedPromise('healthProbe', () => checkHealthStatus()));
    const [isHealthy, setIsHealthy] = useState<boolean>(initiallyHealthy);

    if (isHealthy) {
        return <GameRoomForm onSelfPlayStart={onSelfPlayStart} />;
    }

    return <LazyServiceHealthCheckView onHealthy={() => setIsHealthy(true)} />;
}

export default GameRoomFormHealthGate;
