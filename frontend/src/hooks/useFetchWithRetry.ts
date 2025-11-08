import { useEffect, useRef, useState } from 'react';

import { RequestTimeoutError, ServiceUnavailableError } from '@grouchess/errors';

type UseFetchWithRetryParams<T> = {
    /**
     * The fetch function to call. Should be wrapped in useCallback if it has dependencies.
     */
    fetchFunction: () => Promise<T>;
    /**
     * Maximum number of timeout errors before throwing ServiceUnavailableError.
     * @default 12
     */
    maxTimeoutErrorCount?: number;
    /**
     * Maximum number of non-timeout errors before throwing the error.
     * @default 3
     */
    maxNonTimeoutErrorCount?: number;
    onSuccess?: (data: T) => void;
};

type UseFetchWithRetryResult = {
    isSuccess: boolean;
    timeoutErrorCount: number;
    nonTimeoutErrorCount: number;
};

/**
 * Hook that manages retries for a fetch function.
 * Automatically retries on errors, distinguishing between timeout and non-timeout errors.
 * Throws ServiceUnavailableError when timeout limit is exceeded.
 * Throws the actual error when non-timeout error limit is exceeded.
 */
export function useFetchWithRetry<T>({
    fetchFunction,
    maxTimeoutErrorCount = 12,
    maxNonTimeoutErrorCount = 3,
    onSuccess,
}: UseFetchWithRetryParams<T>): UseFetchWithRetryResult {
    const [isSuccess, setIsSuccess] = useState(false);
    const [timeoutErrorCount, setTimeoutErrorCount] = useState(0);
    const [nonTimeoutErrorCount, setNonTimeoutErrorCount] = useState(0);
    const [latestError, setLatestError] = useState<Error | null>(null);

    // Use ref for onSuccess to avoid re-triggering effect when it changes
    const onSuccessRef = useRef(onSuccess);
    useEffect(() => {
        onSuccessRef.current = onSuccess;
    }, [onSuccess]);

    // Throw when timeout limit exceeded
    if (timeoutErrorCount >= maxTimeoutErrorCount) {
        throw new ServiceUnavailableError();
    }

    // Throw when non-timeout error limit exceeded
    if (
        latestError &&
        !(latestError instanceof RequestTimeoutError) &&
        nonTimeoutErrorCount >= maxNonTimeoutErrorCount
    ) {
        throw latestError;
    }

    // Effect to perform fetch and retry on errors
    useEffect(() => {
        if (isSuccess) return;

        const doFetch = async () => {
            try {
                const result = await fetchFunction();
                setIsSuccess(true);
                onSuccessRef.current?.(result);
            } catch (error) {
                const err = error instanceof Error ? error : new Error('Unknown error');
                setLatestError(err);

                if (err instanceof RequestTimeoutError) {
                    setTimeoutErrorCount((count) => count + 1);
                } else {
                    setNonTimeoutErrorCount((count) => count + 1);
                }
            }
        };

        doFetch();
    }, [fetchFunction, isSuccess, timeoutErrorCount, nonTimeoutErrorCount]);

    return { isSuccess, timeoutErrorCount, nonTimeoutErrorCount };
}
