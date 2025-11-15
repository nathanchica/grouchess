import { InvalidInputError } from '@grouchess/errors';
import * as Sentry from '@sentry/react';
import invariant from 'tiny-invariant';
import * as z from 'zod';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Validates data against a schema and throws a custom error if validation fails.
 */
function getParsedData<T extends z.ZodType>(options: {
    data: unknown;
    schema: T;
    onParseError: (error: z.ZodError) => never;
}): z.infer<T> {
    const result = options.schema.safeParse(options.data);
    if (!result.success) {
        options.onParseError(result.error);
    }
    return result.data;
}

export type FetchWithSchemasOptions<
    RequestSchema extends z.ZodType | undefined,
    SuccessSchema extends z.ZodType,
    ErrorSchema extends z.ZodType | undefined,
> = {
    method?: HttpMethod;
    requestSchema?: RequestSchema;
    successSchema: SuccessSchema;
    errorSchema?: ErrorSchema;
    body?: RequestSchema extends z.ZodType ? z.input<RequestSchema> : undefined;
    /**
     * Additional fetch options excluding method, body, and headers which are managed by this helper.
     */
    // eslint-disable-next-line no-undef -- RequestInit is a built-in DOM type
    init?: Omit<RequestInit, 'method' | 'body' | 'headers'>;
    /**
     * Optional headers to send with the request. When a body is present, a
     * Content-Type of application/json will be added if not already set.
     */
    headers?: Record<string, string>;
};

export type FetchSuccessResult<SuccessSchema extends z.ZodType> = {
    ok: true;
    kind: 'success';
    status: number;
    data: z.infer<SuccessSchema>;
};

export type FetchHttpErrorResult<ErrorSchema extends z.ZodType | undefined> = {
    ok: false;
    kind: 'http-error';
    status: number;
    error: ErrorSchema extends z.ZodTypeAny ? z.infer<ErrorSchema> | null : null;
    /**
     * Optional underlying error when parsing the error response fails.
     */
    cause?: Error;
};

export type FetchNetworkErrorResult = {
    ok: false;
    kind: 'network-error';
    status: number | null;
    error: Error;
};

export type FetchWithSchemasResult<SuccessSchema extends z.ZodType, ErrorSchema extends z.ZodType | undefined> =
    | FetchSuccessResult<SuccessSchema>
    | FetchHttpErrorResult<ErrorSchema>
    | FetchNetworkErrorResult;

/**
 * Type-safe fetch wrapper with Zod schema validation for request and response data.
 *
 * Validates request bodies before sending and response data after receiving, providing
 * compile-time and runtime type safety. Returns a discriminated union result type
 * for structured error handling.
 *
 * @template RequestSchema - Zod schema for validating the request body (optional)
 * @template SuccessSchema - Zod schema for validating successful responses (required)
 * @template ErrorSchema - Zod schema for validating error responses (optional)
 *
 * @param url - The URL to fetch from
 * @param options - Configuration options
 * @param options.method - HTTP method (defaults to 'GET')
 * @param options.requestSchema - Schema to validate request body. Required if body is provided.
 * @param options.successSchema - Schema to validate successful (2xx) response data
 * @param options.errorSchema - Schema to validate error response data (optional)
 * @param options.body - Request body (typed according to requestSchema)
 * @param options.init - Additional fetch options (credentials, signal, etc.)
 * @param options.headers - Custom headers (Content-Type auto-added for JSON bodies)
 *
 * @returns Promise that resolves to a discriminated union result:
 * - `{ ok: true, kind: 'success', status: number, data: T }` - Successful request
 * - `{ ok: false, kind: 'http-error', status: number, error: E | null, cause?: Error }` - HTTP error (4xx, 5xx)
 * - `{ ok: false, kind: 'network-error', status: number | null, error: Error }` - Network/fetch failure
 *
 * @throws {InvalidInputError} When request body fails schema validation
 * @throws {z.ZodError} When response data doesn't match expected schema (indicates contract violation)
 * @throws {Error} (via invariant) When body is provided without requestSchema
 *
 * @example
 * // POST request with validation
 * const result = await fetchWithSchemas('/api/users', {
 *   method: 'POST',
 *   requestSchema: z.object({ name: z.string(), age: z.number() }),
 *   successSchema: z.object({ id: z.string(), created: z.boolean() }),
 *   errorSchema: z.object({ error: z.string() }),
 *   body: { name: 'Alice', age: 30 },
 * });
 *
 * if (result.ok) {
 *   console.log('Created user:', result.data.id);
 * } else if (result.kind === 'http-error') {
 *   console.error('Server error:', result.error);
 * } else {
 *   console.error('Network error:', result.error.message);
 * }
 *
 * @example
 * // GET request
 * const result = await fetchWithSchemas('/api/users/123', {
 *   successSchema: z.object({ id: z.string(), name: z.string() }),
 * });
 */
export async function fetchWithSchemas<
    RequestSchema extends z.ZodType | undefined,
    SuccessSchema extends z.ZodType,
    ErrorSchema extends z.ZodType | undefined = undefined,
>(
    url: string,
    {
        method = 'GET',
        requestSchema,
        successSchema,
        errorSchema,
        body,
        init,
        headers,
    }: FetchWithSchemasOptions<RequestSchema, SuccessSchema, ErrorSchema>
): Promise<FetchWithSchemasResult<SuccessSchema, ErrorSchema>> {
    const hasBody = body !== undefined;

    // If a body is provided, a requestSchema must be provided to validate it
    if (hasBody) {
        invariant(requestSchema, 'requestSchema is required when body is provided');
    }

    // Validate request body if a schema is provided. Throws InvalidInputError if invalid.
    const validatedBody =
        requestSchema && hasBody
            ? getParsedData({
                  data: body,
                  schema: requestSchema,
                  onParseError: (error) => {
                      throw new InvalidInputError(error.message);
                  },
              })
            : body;

    const finalHeaders: Record<string, string> = {
        ...(headers ?? {}),
    };

    if (validatedBody !== undefined && finalHeaders['Content-Type'] === undefined) {
        finalHeaders['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
        response = await fetch(url, {
            ...init,
            method,
            headers: finalHeaders,
            body: validatedBody !== undefined ? JSON.stringify(validatedBody) : undefined,
        });
    } catch (error) {
        const err = error instanceof Error ? error : new Error('Network error');
        return {
            ok: false,
            kind: 'network-error',
            status: null,
            error: err,
        } as FetchWithSchemasResult<SuccessSchema, ErrorSchema>;
    }

    let json: unknown;
    try {
        json = await response.json();
    } catch (error) {
        // Response is not valid JSON
        const err = error instanceof Error ? error : new Error('Failed to parse JSON response');
        if (!response.ok) {
            return {
                ok: false,
                kind: 'http-error',
                status: response.status,
                error: null,
                cause: err,
            } as FetchWithSchemasResult<SuccessSchema, ErrorSchema>;
        }

        return {
            ok: false,
            kind: 'network-error',
            status: response.status,
            error: err,
        } as FetchWithSchemasResult<SuccessSchema, ErrorSchema>;
    }

    if (!response.ok) {
        if (errorSchema) {
            const error = getParsedData({
                data: json,
                schema: errorSchema,
                onParseError: (error) => {
                    // If an error schema is provided but parsing fails, this indicates
                    // an unexpected response shape. Surface this as a thrown error so
                    // callers (or error boundaries) can handle it explicitly.
                    throw error;
                },
            });

            return {
                ok: false,
                kind: 'http-error',
                status: response.status,
                error,
            } as FetchWithSchemasResult<SuccessSchema, ErrorSchema>;
        }

        return {
            ok: false,
            kind: 'http-error',
            status: response.status,
            error: null,
        } as FetchWithSchemasResult<SuccessSchema, ErrorSchema>;
    }

    const data = getParsedData({
        data: json,
        schema: successSchema,
        onParseError: (error) => {
            // If a success schema is provided but parsing fails, this indicates
            // an unexpected response shape. Surface this as a thrown error so
            // callers (or error boundaries) can handle it explicitly.
            throw error;
        },
    });

    return {
        ok: true,
        kind: 'success',
        status: response.status,
        data,
    };
}

/**
 * Wrapper around `fetchWithSchemas` that simplifies error handling by throwing errors
 * instead of returning a discriminated union.
 *
 * - On success: returns the parsed data directly
 * - On `InvalidInputError`: rethrows as-is (client-side validation error)
 * - On any other error: logs to Sentry and throws a generic user-facing error
 *
 * Use this when you want simplified error handling in try/catch blocks rather than
 * checking discriminated union results.
 *
 * @template RequestSchema - Zod schema for validating the request body (optional)
 * @template SuccessSchema - Zod schema for validating successful responses (required)
 * @template ErrorSchema - Zod schema for validating error responses (optional)
 *
 * @param url - The URL to fetch from
 * @param options - Same as `fetchWithSchemas` options plus:
 * @param options.errorMessage - User-facing error message to throw on failures
 *
 * @returns Promise that resolves to the validated success data
 *
 * @throws {InvalidInputError} When request body fails schema validation
 * @throws {Error} Generic error with `errorMessage` on any other failure (after logging to Sentry)
 *
 * @example
 * try {
 *   const user = await fetchWithSchemasOrThrow('/api/users', {
 *     method: 'POST',
 *     requestSchema: z.object({ name: z.string() }),
 *     successSchema: z.object({ id: z.string() }),
 *     body: { name: 'Alice' },
 *     errorMessage: 'Failed to create user. Please try again.',
 *   });
 *   console.log('Created user:', user.id);
 * } catch (error) {
 *   if (error instanceof InvalidInputError) {
 *     // Handle validation error
 *   } else {
 *     // Handle generic error (details logged to Sentry)
 *   }
 * }
 */
export async function fetchWithSchemasOrThrow<
    RequestSchema extends z.ZodType | undefined,
    SuccessSchema extends z.ZodType,
    ErrorSchema extends z.ZodType | undefined = undefined,
>(
    url: string,
    options: FetchWithSchemasOptions<RequestSchema, SuccessSchema, ErrorSchema> & {
        errorMessage: string;
    }
): Promise<z.infer<SuccessSchema>> {
    const { errorMessage, ...fetchOptions } = options;

    const method = fetchOptions.method ?? 'GET';
    let result: FetchWithSchemasResult<SuccessSchema, ErrorSchema>;

    try {
        result = await fetchWithSchemas(url, fetchOptions);
    } catch (error) {
        // Rethrow InvalidInputError (client-side validation errors should surface to user)
        if (error instanceof InvalidInputError) {
            throw error;
        }

        // All other errors (invariant, ZodError, etc.) - log to Sentry and throw generic error
        Sentry.captureException(error, {
            extra: {
                url,
                method,
            },
        });

        throw new Error(errorMessage);
    }

    if (!result.ok) {
        if (result.kind === 'http-error') {
            // For HTTP errors, throw the server error message
            const message =
                result.error && typeof result.error === 'object' && 'error' in result.error
                    ? (result.error as { error: string }).error
                    : errorMessage;
            throw new Error(message);
        }

        // For network errors, throw generic error
        throw new Error(errorMessage);
    }

    return result.data;
}

const promiseCache = new Map<string, Promise<unknown>>();

/**
 * Caches promises based on a key for fetching with `use` using a stable promise in React components.
 * Cache is in-memory only, resets on page reload, and lasts for the lifetime of the application.
 *
 * @param key Unique key to identify the cached promise.
 * @param fetchFunction Function that returns a promise to be cached.
 * @returns The cached promise if it exists; otherwise, calls `fetchFunction`, caches its promise, and returns it.
 */
export function getCachedPromise<T>(key: string, fetchFunction: () => Promise<T>): Promise<T> {
    if (promiseCache.has(key)) {
        return promiseCache.get(key) as Promise<T>;
    }

    const promise = fetchFunction();
    promiseCache.set(key, promise);
    return promise;
}

// For testing purposes only
export function _resetPromiseCacheForTesting(): void {
    promiseCache.clear();
}
