import { useCallback, useEffect, useRef, useState } from 'react';

import * as z from 'zod';

import { fetchWithSchemasOrThrow, type FetchWithSchemasOptions } from '../utils/fetch';

type FetchWithSchemaOptions<
    RequestSchema extends z.ZodType | undefined,
    SuccessSchema extends z.ZodType,
    ErrorSchema extends z.ZodType | undefined,
> = FetchWithSchemasOptions<RequestSchema, SuccessSchema, ErrorSchema> & {
    url: string;
    errorMessage: string;
    onSuccess?: (data: z.infer<SuccessSchema>) => void;
    onError?: (error: Error) => void;
};

export type FetchWithSchemaFn = <
    RequestSchema extends z.ZodType | undefined,
    SuccessSchema extends z.ZodType,
    ErrorSchema extends z.ZodType | undefined = undefined,
>(
    options: FetchWithSchemaOptions<RequestSchema, SuccessSchema, ErrorSchema>
) => Promise<z.infer<SuccessSchema> | null>;

export type UseFetchWithSchemaResult = {
    execute: FetchWithSchemaFn;
    loading: boolean;
    error: Error | null;
};

/**
 * Generic hook for making type-safe API requests with schema validation.
 *
 * Provides:
 * - Loading and error state management
 * - Duplicate request prevention
 * - Unmount guards to prevent state updates on unmounted components
 * - Success and error callbacks
 *
 * @returns Object with execute function, loading state, and error state
 *
 * @example
 * const { execute, loading, error } = useFetchWithSchema();
 *
 * const data = await execute({
 *   url: '/api/users',
 *   method: 'POST',
 *   successSchema: UserSchema,
 *   body: { name: 'Alice' },
 *   errorMessage: 'Failed to create user',
 *   onSuccess: (user) => console.log('Created:', user),
 *   onError: (err) => console.error('Failed:', err),
 * });
 */
export function useFetchWithSchema(): UseFetchWithSchemaResult {
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

    const execute = useCallback<FetchWithSchemaFn>(async (options) => {
        // Prevent duplicate requests and avoid setting state on unmounted component
        if (loadingRef.current || !isMountedRef.current) {
            return null;
        }

        const { url, errorMessage, onSuccess, onError, ...fetchOptions } = options;

        loadingRef.current = true;
        setLoading(true);
        setError(null);

        try {
            const data = await fetchWithSchemasOrThrow(url, {
                ...fetchOptions,
                errorMessage,
            });

            setError(null);
            onSuccess?.(data);
            return data;
        } catch (err) {
            const error = err as Error;
            setError(error);
            onError?.(error);
            return null;
        } finally {
            if (isMountedRef.current) {
                loadingRef.current = false;
                setLoading(false);
            }
        }
    }, []);

    return {
        execute,
        loading,
        error,
    };
}
