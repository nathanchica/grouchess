import { useCallback, useEffect, useRef, useState } from 'react';

import { RequestTimeoutError } from '@grouchess/errors';
import type { HealthStatusResponse } from '@grouchess/http-schemas';

import { fetchParsedHealthStatus } from '../utils/health';

type FetchHealthStatusParams = {
    onSuccess?: (data: HealthStatusResponse) => void;
    onError?: (error: Error | RequestTimeoutError) => void;
    timeoutMs?: number;
};

type UseFetchHealthResult = {
    fetchHealthStatus: (params?: FetchHealthStatusParams) => Promise<void>;
    loading: boolean;
    error: Error | RequestTimeoutError | null;
};

export function useFetchServiceHealth(): UseFetchHealthResult {
    // Dual loading tracking: state for UI reactivity, ref for race condition prevention
    // - loading state triggers re-renders for UI updates (spinners, disabled buttons)
    // - loadingRef prevents duplicate requests without causing dependency array issues
    const [loading, setLoading] = useState<boolean>(false);
    const loadingRef = useRef(false);

    const [error, setError] = useState<Error | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const fetchHealthStatus = useCallback(async ({ onSuccess, onError, timeoutMs }: FetchHealthStatusParams = {}) => {
        if (loadingRef.current) {
            return;
        }

        try {
            loadingRef.current = true;
            setLoading(true);
            setError(null);

            const parsed = await fetchParsedHealthStatus({ timeoutMs });
            onSuccess?.(parsed);
        } catch (fetchError) {
            let err;
            if (fetchError instanceof RequestTimeoutError) {
                err = fetchError;
            } else {
                err = new Error('Failed to load service health.');
            }

            if (isMountedRef.current) {
                setError(err);
                onError?.(err);
            }
        } finally {
            if (isMountedRef.current) {
                loadingRef.current = false;
                setLoading(false);
            }
        }
    }, []);

    return {
        fetchHealthStatus,
        loading,
        error,
    };
}
