import { useCallback, useEffect, useRef } from 'react';

import type { ClockUpdatePayload } from '@grouchess/socket-events';
import invariant from 'tiny-invariant';

import { useChessClock } from '../../providers/ChessGameRoomProvider';
import { useClockTick } from '../../providers/ClockTickProvider';
import { useSocket } from '../../providers/SocketProvider';
import { rebaseServerClockToPerf } from '../../utils/clock';

/**
 * Synchronizes chess clock state with server for clock update events
 */
function ChessClocksSocketController() {
    const { socket } = useSocket();
    const { start, stop } = useClockTick();
    const { setClocks, clockState } = useChessClock();
    invariant(clockState, 'ChessClocksSocketController requires non-null clockState');

    const wasRunningRef = useRef<boolean>(false);

    const onClockUpdate = useCallback(
        ({ clockState }: ClockUpdatePayload) => {
            setClocks(clockState ? rebaseServerClockToPerf(clockState) : null);
        },
        [setClocks]
    );

    useEffect(() => {
        socket.on('clock_update', onClockUpdate);

        return () => {
            socket.off('clock_update', onClockUpdate);
        };
    }, [onClockUpdate, socket]);

    // Drive shared monotonic tick on server-managed games for smooth countdown display
    useEffect(() => {
        const shouldRun = !clockState.isPaused && (clockState.white.isActive || clockState.black.isActive);
        if (shouldRun) {
            if (!wasRunningRef.current) {
                start();
                wasRunningRef.current = true;
            }
        } else if (wasRunningRef.current) {
            stop();
            wasRunningRef.current = false;
        }
    }, [clockState, start, stop]);

    return null;
}

export default ChessClocksSocketController;
