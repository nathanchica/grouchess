import { useEffect, useState } from 'react';

import type { TimeControl } from '../providers/GameRoomProvider';

type TimeControlResponse = {
    supportedTimeControls: TimeControl[];
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const TIME_CONTROL_ENDPOINT = apiBaseUrl ? `${apiBaseUrl}/time-control` : null;

type UseFetchTimeControlOptionsResult = {
    timeControlOptions: TimeControl[];
    loading: boolean;
    error: Error | null;
};

export function useFetchTimeControlOptions(): UseFetchTimeControlOptionsResult {
    const [timeControlOptions, setTimeControlOptions] = useState<TimeControl[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let isMounted = true;

        if (!TIME_CONTROL_ENDPOINT) {
            setLoading(false);
            setError(new Error('Time control endpoint is not configured.'));
            return () => {
                isMounted = false;
            };
        }

        const fetchTimeControls = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch(TIME_CONTROL_ENDPOINT);
                if (!response.ok) {
                    throw new Error('Unable to load time controls right now.');
                }

                const data = (await response.json()) as TimeControlResponse;
                if (!isMounted) return;

                setTimeControlOptions(data.supportedTimeControls);
            } catch (fetchError) {
                if (!isMounted) return;
                setError(fetchError instanceof Error ? fetchError : new Error('Failed to load time controls.'));
                setTimeControlOptions([]);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchTimeControls();

        return () => {
            isMounted = false;
        };
    }, []);

    return {
        timeControlOptions,
        loading,
        error,
    };
}
