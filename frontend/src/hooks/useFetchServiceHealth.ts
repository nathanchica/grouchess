import { useCallback, useEffect, useRef, useState } from 'react';

import { NotConfiguredError, RequestTimeoutError } from '@grouchess/errors';
import { HealthStatusResponseSchema, type HealthStatusResponse } from '@grouchess/http-schemas';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

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
    if (!apiBaseUrl) {
        throw new NotConfiguredError('API base URL is not configured.');
    }

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

        const controller = timeoutMs ? new AbortController() : null;
        const timeoutId = timeoutMs ? window.setTimeout(() => controller?.abort(), timeoutMs) : null;

        try {
            loadingRef.current = true;
            setLoading(true);
            setError(null);

            const response = await fetch(`${apiBaseUrl}/health`, {
                signal: controller?.signal,
            });

            if (!response.ok) {
                throw new Error('Unable to load service health right now.');
            }

            const json = await response.json();
            const parsed = HealthStatusResponseSchema.parse(json);
            onSuccess?.(parsed);
        } catch (fetchError) {
            let err: Error;
            if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
                err = new RequestTimeoutError();
            } else if (fetchError instanceof Error) {
                err = fetchError;
            } else {
                err = new Error('Failed to load service health.');
            }

            if (isMountedRef.current) {
                setError(err);
                onError?.(err);
            }
        } finally {
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }
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
