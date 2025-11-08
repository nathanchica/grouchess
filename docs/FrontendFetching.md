# Frontend Fetching

### Architecture

The frontend uses a custom data fetching architecture built around React Suspense and Error Boundaries. This approach
allows for declarative data fetching, where components can "suspend" rendering until the required data is available,
and handle errors gracefully.

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

import { getCachedPromise } from '../../../utils/fetch';

async function fetchTimeControlOptions(): Promise<GetTimeControlOptionsResponse> {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

    if (!apiBaseUrl) {
        throw new Error('API base endpoint is not configured.');
    }

    const response = await fetch(`${apiBaseUrl}/time-control`);

    if (!response.ok) {
        throw new Error('Failed to fetch time control options.');
    }

    const data = await response.json();
    const parsedData = GetTimeControlOptionsResponseSchema.safeParse(data);

    if (!parsedData.success) {
        throw new Error('Failed to parse time control options.');
    }

    return parsedData.data;
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

### Testing

- Prompt for creating test skeleton:

```md
Use the react-test-case-planner agent to plan test cases for the <ComponentName> component.
Then create a test file with those test cases (don't implement the test cases yet)
```

- Then use unit-test-generator agent to implement the test cases
- Mocking fetch example:

```ts
const mockGetTimeControlOptionsResponse: GetTimeControlOptionsResponse = {
    supportedTimeControls: [
        createMockTimeControl({ alias: '3|2', minutes: 3, increment: 2, displayText: '3|2' }),
        createMockTimeControl({ alias: '5|0', minutes: 5, increment: 0, displayText: '5 min' }),
        createMockTimeControl({ alias: '10|0', minutes: 10, increment: 0, displayText: '10 min' }),
    ],
};

type CreateFetchResponseArgs = {
    data?: GetTimeControlOptionsResponse | null;
    ok?: boolean;
};

function createFetchResponse({
    data = mockGetTimeControlOptionsResponse,
    ok = true,
}: CreateFetchResponseArgs = {}): Response {
    return {
        ok,
        json: vi.fn().mockResolvedValue(data),
    } as unknown as Response;
}

const defaultFetchResponse = createFetchResponse();

afterEach(() => {
    // Needed otherwise each test shares the same promise cache
    _resetPromiseCacheForTesting();
});

it('fetches data successfully', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(defaultFetchResponse);

    // ...test implementation
});

describe('Loading State (Suspense Fallback)', () => {
    beforeEach(() => {
        // Delay the fetch response to observe the loading state
        const delayedFetchPromise = new Promise<Response>((resolve) => {
            setTimeout(() => resolve(defaultFetchResponse), 100);
        });
        vi.spyOn(window, 'fetch').mockReturnValue(delayedFetchPromise);
    });

    it('shows shimmer loading state while fetching time control options', async () => {
        const { getByRole } = await render(<TimeControlForm {...defaultProps} />);

        const loadingStatus = getByRole('status', { name: /loading time control options/i });
        await expect.element(loadingStatus).toBeInTheDocument();
    });

    it('transitions from loading to loaded state', async () => {
        const { getByRole } = await render(<TimeControlForm {...defaultProps} />);

        // Verify shimmer loading state is initially visible
        const loadingStatus = getByRole('status', { name: /loading time control options/i });
        await expect.element(loadingStatus).toBeInTheDocument();

        // Wait for loading state to disappear and content to load
        await expect.element(loadingStatus).not.toBeInTheDocument();

        // Verify actual content is now displayed
        const timeControlOptions = getByRole('group', { name: /time control options/i });
        await expect.element(timeControlOptions).toBeInTheDocument();
    });
});

describe('Error State (ErrorBoundary)', () => {
    it.each([
        {
            scenario: 'fetch fails with network error',
            setup: () => {
                vi.spyOn(window, 'fetch').mockRejectedValue(new Error('Network error'));
            },
            expectedError: 'Network error',
        },
        {
            scenario: 'API returns non-ok response',
            setup: () => {
                vi.spyOn(window, 'fetch').mockResolvedValue(createFetchResponse({ ok: false }));
            },
            expectedError: 'Failed to fetch time control options.',
        },
        {
            scenario: 'API response fails schema validation',
            setup: () => {
                vi.spyOn(window, 'fetch').mockResolvedValue(
                    createFetchResponse({ data: { invalid: 'data' } as unknown as GetTimeControlOptionsResponse })
                );
            },
            expectedError: 'Failed to parse time control options.',
        },
    ])('shows error when $scenario', async ({ setup, expectedError }) => {
        vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error boundary logging
        setup();

        const { getByRole } = await render(<TimeControlForm {...defaultProps} />);

        const errorAlert = getByRole('alert');
        await expect.element(errorAlert).toBeInTheDocument();
        await expect.element(errorAlert).toHaveTextContent(expectedError);
    });
});
```
