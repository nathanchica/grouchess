# Frontend Fetching

## Overview

The frontend uses two main approaches for data fetching:

1. **React Suspense + Error Boundaries**: For declarative data fetching in components using `use()`
2. **Custom Hooks**: For imperative data fetching with loading/error states using `useFetchWithSchema`

Both approaches use type-safe fetch utilities with Zod schema validation.

---

## Fetch Utilities

### `fetchWithSchemasOrThrow`

A type-safe wrapper around `fetch` that validates request/response data using Zod schemas and throws errors for simplified error handling.

```typescript
import { fetchWithSchemasOrThrow } from '../utils/fetch';

// GET request
const data = await fetchWithSchemasOrThrow('/api/users', {
    successSchema: UserSchema,
    errorMessage: 'Failed to fetch users',
});

// POST request with body
const newUser = await fetchWithSchemasOrThrow('/api/users', {
    method: 'POST',
    requestSchema: CreateUserSchema,
    successSchema: UserSchema,
    errorSchema: ErrorResponseSchema,
    body: { name: 'Alice', age: 30 },
    errorMessage: 'Failed to create user',
});

// With custom headers (e.g., authorization)
const data = await fetchWithSchemasOrThrow(`/api/protected`, {
    successSchema: DataSchema,
    headers: {
        Authorization: `Bearer ${token}`,
    },
    errorMessage: 'Failed to fetch protected data',
});
```

**Features:**

- Automatic request body validation
- Automatic response validation
- Type inference from schemas
- Automatic Sentry error logging
- User-friendly error messages

---

## React Hooks

### `useFetchWithSchema`

A generic hook for making type-safe API requests with automatic loading/error state management.

```typescript
import { useFetchWithSchema } from '../hooks/useFetchWithSchema';

function MyComponent() {
    const { execute, loading, error } = useFetchWithSchema();

    const handleSubmit = async () => {
        const data = await execute({
            url: '/api/users',
            method: 'POST',
            requestSchema: CreateUserSchema,
            successSchema: UserSchema,
            body: { name: 'Alice' },
            errorMessage: 'Failed to create user',
            onSuccess: (user) => console.log('Created:', user),
            onError: (err) => console.error('Failed:', err),
        });
    };

    return (
        <div>
            {loading && <Spinner />}
            {error && <ErrorMessage error={error} />}
            <button onClick={handleSubmit}>Submit</button>
        </div>
    );
}
```

**Features:**

- Automatic loading/error state management
- Duplicate request prevention
- Unmount guards (prevents state updates on unmounted components)
- Success/error callbacks
- Returns null on duplicate/unmounted calls

**Common Pattern**: Create specialized hooks that wrap `useFetchWithSchema`:

```typescript
// useCreateGameRoom.ts
export function useCreateGameRoom() {
    const { execute, loading, error } = useFetchWithSchema();

    const createGameRoom = useCallback(
        async ({ displayName, color, onSuccess, onError }) => {
            return execute({
                url: `${getEnv().VITE_API_BASE_URL}/room`,
                method: 'POST',
                requestSchema: CreateGameRoomRequestSchema,
                successSchema: CreateGameRoomResponseSchema,
                errorSchema: ErrorResponseSchema,
                body: { displayName, color },
                errorMessage: 'Unable to create game room right now.',
                onSuccess,
                onError,
            });
        },
        [execute]
    );

    return { createGameRoom, loading, error };
}
```

---

## Suspense + Error Boundaries

The frontend uses React Suspense and Error Boundaries for declarative data fetching, where components can "suspend" rendering until the required data is available and handle errors gracefully.

Example from `TimeControlForm` component:

```tsx
// TimeControlForm.tsx

import { Suspense } from 'react';

import type { TimeControl } from '@grouchess/models';
import { ErrorBoundary } from 'react-error-boundary';

import ErrorView from './ErrorView';
import TimeControlOptions from './TimeControlOptions';
import TimeControlOptionsShimmer from './TimeControlOptionsShimmer';

type Props = {
    onTimeControlSelect: (timeControl: TimeControl | null) => void;
};

function TimeControlForm({ onTimeControlSelect }: Props) {
    return (
        <div>
            <h2 className="text-lg sm:text-xl font-semibold text-zinc-100">Time Control</h2>

            <div className="mt-6">
                <Suspense fallback={<TimeControlOptionsShimmer />}>
                    <ErrorBoundary fallbackRender={ErrorView}>
                        <TimeControlOptions onTimeControlSelect={onTimeControlSelect} />
                    </ErrorBoundary>
                </Suspense>
            </div>
        </div>
    );
}

export default TimeControlForm;
```

```tsx
// TimeControlOptionsShimmer.tsx

const NUM_SHIMMERS = 6;

function TimeControlOptionsShimmer() {
    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: NUM_SHIMMERS }).map((_, index) => (
                <div
                    key={`time-control-shimmer-${index}`}
                    className="h-16 animate-pulse rounded-2xl bg-emerald-500/10"
                />
            ))}
        </div>
    );
}

export default TimeControlOptionsShimmer;
```

```tsx
// ErrorView.tsx

import type { FallbackProps } from 'react-error-boundary';

function ErrorView({ error }: FallbackProps) {
    return (
        <p role="alert" className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error.message}
        </p>
    );
}

export default ErrorView;
```

```tsx
// TimeControlOptions.tsx

import { use, useState } from 'react';

import { type GetTimeControlOptionsResponse, GetTimeControlOptionsResponseSchema } from '@grouchess/http-schemas';
import type { TimeControl } from '@grouchess/models';

import { getEnv } from '../../../utils/config';
import { getCachedPromise, fetchWithSchemasOrThrow } from '../../../utils/fetch';

async function fetchTimeControlOptions(): Promise<GetTimeControlOptionsResponse> {
    const url = `${getEnv().VITE_API_BASE_URL}/time-control`;
    return fetchWithSchemasOrThrow(url, {
        successSchema: GetTimeControlOptionsResponseSchema,
        errorMessage: 'Failed to fetch time control options.',
    });
}

type Props = {
    onTimeControlSelect: (timeControl: TimeControl | null) => void;
};

function TimeControlOptions({ onTimeControlSelect }: Props) {
    const { supportedTimeControls } = use(getCachedPromise(`getTimeControlOptions`, fetchTimeControlOptions));

    /* rest of the component logic */
}

export default TimeControlOptions;
```

#### Utility: `getCachedPromise`

React's `use` requires a stable promise reference to avoid refetching on every render. `getCachedPromise` provides
a simple in-memory caching mechanism for promises based on a unique key.

```ts
// fetch.ts

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
```

---

## Testing

### Testing Hooks (`useFetchWithSchema` and derived hooks)

When testing hooks that use `useFetchWithSchema`, mock `fetchWithSchemasOrThrow`:

```typescript
import { fetchWithSchemasOrThrow } from '../../utils/fetch';
import { useCreateGameRoom } from '../useCreateGameRoom';

vi.mock('../../utils/fetch', () => ({
    fetchWithSchemasOrThrow: vi.fn(),
}));

const fetchWithSchemasOrThrowMock = vi.mocked(fetchWithSchemasOrThrow);

describe('useCreateGameRoom', () => {
    beforeEach(() => {
        fetchWithSchemasOrThrowMock.mockReset();
    });

    it('creates a game room successfully', async () => {
        const mockResponse = { roomId: 'room-123', playerId: 'player-456', token: 'token-789' };
        fetchWithSchemasOrThrowMock.mockResolvedValue(mockResponse);

        const { result } = await renderHook(() => useCreateGameRoom());
        const onSuccess = vi.fn();

        await result.current.createGameRoom({
            displayName: 'Alice',
            color: 'white',
            onSuccess,
        });

        expect(onSuccess).toHaveBeenCalledWith(mockResponse);
        await vi.waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.error).toBeNull();
    });

    it('handles errors', async () => {
        const error = new Error('Failed to create room');
        fetchWithSchemasOrThrowMock.mockRejectedValue(error);

        const { result } = await renderHook(() => useCreateGameRoom());
        const onError = vi.fn();

        await result.current.createGameRoom({
            displayName: 'Alice',
            onError,
        });

        expect(onError).toHaveBeenCalledWith(error);
        await vi.waitFor(() => expect(result.current.error).toBe(error));
    });
});
```

### Testing Suspense Components

When testing components that use Suspense with `fetchWithSchemasOrThrow`, mock the utility and reset the promise cache:

```typescript
import { _resetPromiseCacheForTesting, fetchWithSchemasOrThrow } from '../../../../utils/fetch';
import TimeControlForm from '../TimeControlForm';

vi.mock('../../../../utils/fetch', async () => {
    const actual = await vi.importActual('../../../../utils/fetch');
    return {
        ...actual,
        fetchWithSchemasOrThrow: vi.fn(),
    };
});

const fetchWithSchemasOrThrowMock = vi.mocked(fetchWithSchemasOrThrow);

const mockResponse: GetTimeControlOptionsResponse = {
    supportedTimeControls: [
        createMockTimeControl({ alias: '3|2', minutes: 3, increment: 2, displayText: '3|2' }),
        createMockTimeControl({ alias: '5|0', minutes: 5, increment: 0, displayText: '5 min' }),
    ],
};

afterEach(() => {
    // Reset promise cache so each test gets fresh data
    _resetPromiseCacheForTesting();
});

describe('TimeControlForm', () => {
    it('fetches data successfully', async () => {
        fetchWithSchemasOrThrowMock.mockResolvedValue(mockResponse);

        const { getByRole } = await render(<TimeControlForm {...defaultProps} />);

        const option1 = getByRole('radio', { name: /3\|2 time control option/i });
        await expect.element(option1).toBeInTheDocument();
    });

    describe('Loading State (Suspense Fallback)', () => {
        beforeEach(() => {
            // Delay the response to observe loading state
            const delayedPromise = new Promise<GetTimeControlOptionsResponse>((resolve) => {
                setTimeout(() => resolve(mockResponse), 100);
            });
            fetchWithSchemasOrThrowMock.mockReturnValue(delayedPromise);
        });

        it('shows shimmer loading state', async () => {
            const { getByRole } = await render(<TimeControlForm {...defaultProps} />);

            const loadingStatus = getByRole('status', { name: /loading time control options/i });
            await expect.element(loadingStatus).toBeInTheDocument();
        });

        it('transitions from loading to loaded state', async () => {
            const { getByRole } = await render(<TimeControlForm {...defaultProps} />);

            // Initially shows loading
            const loadingStatus = getByRole('status', { name: /loading time control options/i });
            await expect.element(loadingStatus).toBeInTheDocument();

            // Then shows content
            await expect.element(loadingStatus).not.toBeInTheDocument();
            const options = getByRole('group', { name: /time control options/i });
            await expect.element(options).toBeInTheDocument();
        });
    });

    describe('Error State (ErrorBoundary)', () => {
        it('shows error when fetch fails', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error boundary logs
            fetchWithSchemasOrThrowMock.mockRejectedValue(new Error('Failed to fetch time control options.'));

            const { getByRole } = await render(<TimeControlForm {...defaultProps} />);

            const errorAlert = getByRole('alert');
            await expect.element(errorAlert).toBeInTheDocument();
            await expect.element(errorAlert).toHaveTextContent('Failed to fetch time control options.');
        });
    });
});
```
