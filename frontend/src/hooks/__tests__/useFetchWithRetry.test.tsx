import { type ReactNode } from 'react';

import { RequestTimeoutError } from '@grouchess/errors';
import { ErrorBoundary } from 'react-error-boundary';
import { render } from 'vitest-browser-react';

import { useFetchWithRetry } from '../useFetchWithRetry';

type TestComponentProps = {
    fetchFunction: () => Promise<unknown>;
    maxTimeoutErrorCount?: number;
    maxNonTimeoutErrorCount?: number;
    onSuccess?: (data: unknown) => void;
};

function TestComponent({
    fetchFunction,
    maxTimeoutErrorCount,
    maxNonTimeoutErrorCount,
    onSuccess,
}: TestComponentProps) {
    const { isSuccess, timeoutErrorCount, nonTimeoutErrorCount } = useFetchWithRetry({
        fetchFunction,
        maxTimeoutErrorCount,
        maxNonTimeoutErrorCount,
        onSuccess,
    });

    return (
        <div>
            <div data-testid="isSuccess">{String(isSuccess)}</div>
            <div data-testid="timeoutErrorCount">{timeoutErrorCount}</div>
            <div data-testid="nonTimeoutErrorCount">{nonTimeoutErrorCount}</div>
        </div>
    );
}

function renderWithErrorBoundary(component: ReactNode) {
    return render(
        <ErrorBoundary fallbackRender={({ error }) => <div data-testid="error-message">{error.message}</div>}>
            {component}
        </ErrorBoundary>
    );
}

describe('useFetchWithRetry', () => {
    beforeEach(() => {
        // Suppress act warnings - they're expected when testing hooks with async effects
        vi.spyOn(console, 'error').mockImplementation((message, ...args) => {
            // Filter out act warnings but log other errors
            if (typeof message === 'string' && message.includes('act(')) {
                return;
            }

            console.error(message, ...args);
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('successful fetch', () => {
        it('sets isSuccess to true when fetch succeeds on first try', async () => {
            const fetchFunction = vi.fn().mockResolvedValue({ status: 'ok' });

            const { getByTestId } = await render(<TestComponent fetchFunction={fetchFunction} />);

            await expect.element(getByTestId('isSuccess')).toHaveTextContent('true');
            await expect.element(getByTestId('timeoutErrorCount')).toHaveTextContent('0');
            await expect.element(getByTestId('nonTimeoutErrorCount')).toHaveTextContent('0');
            expect(fetchFunction).toHaveBeenCalledTimes(1);
        });

        it('calls onSuccess callback with data when fetch succeeds', async () => {
            const responseData = { status: 'ok' };
            const fetchFunction = vi.fn().mockResolvedValue(responseData);
            const onSuccess = vi.fn();

            await render(<TestComponent fetchFunction={fetchFunction} onSuccess={onSuccess} />);

            await vi.waitFor(() => {
                expect(onSuccess).toHaveBeenCalledWith(responseData);
            });
        });

        it('does not retry after successful fetch', async () => {
            const fetchFunction = vi.fn().mockResolvedValue({ status: 'ok' });

            await render(<TestComponent fetchFunction={fetchFunction} />);

            await vi.waitFor(() => {
                expect(fetchFunction).toHaveBeenCalledTimes(1);
            });

            // Wait a bit to ensure no additional calls
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(fetchFunction).toHaveBeenCalledTimes(1);
        });
    });

    describe('timeout error retries', () => {
        it('retries when RequestTimeoutError is thrown', async () => {
            const fetchFunction = vi
                .fn()
                .mockRejectedValueOnce(new RequestTimeoutError())
                .mockRejectedValueOnce(new RequestTimeoutError())
                .mockResolvedValue({ status: 'ok' });

            const { getByTestId } = await render(<TestComponent fetchFunction={fetchFunction} />);

            await expect.element(getByTestId('isSuccess')).toHaveTextContent('true');
            await expect.element(getByTestId('timeoutErrorCount')).toHaveTextContent('2');
            expect(fetchFunction).toHaveBeenCalledTimes(3);
        });

        it('increments timeoutErrorCount on each timeout', async () => {
            const fetchFunction = vi
                .fn()
                .mockRejectedValueOnce(new RequestTimeoutError())
                .mockResolvedValue({ status: 'ok' });

            const { getByTestId } = await render(<TestComponent fetchFunction={fetchFunction} />);

            await expect.element(getByTestId('timeoutErrorCount')).toHaveTextContent('1');
            await expect.element(getByTestId('nonTimeoutErrorCount')).toHaveTextContent('0');
        });

        it('throws ServiceUnavailableError when timeout limit is exceeded', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error boundary logging
            const fetchFunction = vi.fn().mockRejectedValue(new RequestTimeoutError());

            const { getByTestId } = await renderWithErrorBoundary(
                <TestComponent fetchFunction={fetchFunction} maxTimeoutErrorCount={3} />
            );

            await expect
                .element(getByTestId('error-message'))
                .toHaveTextContent('The service is currently unavailable');
        });

        it('uses default maxTimeoutErrorCount of 12 when not provided', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error boundary logging
            const fetchFunction = vi.fn().mockRejectedValue(new RequestTimeoutError());

            const { getByTestId } = await renderWithErrorBoundary(<TestComponent fetchFunction={fetchFunction} />);

            // Should retry up to 12 times before throwing
            await expect
                .element(getByTestId('error-message'))
                .toHaveTextContent('The service is currently unavailable');
            expect(fetchFunction).toHaveBeenCalledTimes(12);
        });
    });

    describe('non-timeout error retries', () => {
        it('retries when non-timeout error is thrown', async () => {
            const fetchFunction = vi
                .fn()
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValue({ status: 'ok' });

            const { getByTestId } = await render(<TestComponent fetchFunction={fetchFunction} />);

            await expect.element(getByTestId('isSuccess')).toHaveTextContent('true');
            await expect.element(getByTestId('nonTimeoutErrorCount')).toHaveTextContent('2');
            expect(fetchFunction).toHaveBeenCalledTimes(3);
        });

        it('increments nonTimeoutErrorCount on each non-timeout error', async () => {
            const fetchFunction = vi
                .fn()
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValue({ status: 'ok' });

            const { getByTestId } = await render(<TestComponent fetchFunction={fetchFunction} />);

            await expect.element(getByTestId('timeoutErrorCount')).toHaveTextContent('0');
            await expect.element(getByTestId('nonTimeoutErrorCount')).toHaveTextContent('1');
        });

        it('throws the error when non-timeout error limit is exceeded', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error boundary logging
            const customError = new Error('Network error');
            const fetchFunction = vi.fn().mockRejectedValue(customError);

            const { getByTestId } = await renderWithErrorBoundary(
                <TestComponent fetchFunction={fetchFunction} maxNonTimeoutErrorCount={2} />
            );

            await expect.element(getByTestId('error-message')).toHaveTextContent('Network error');
        });

        it('uses default maxNonTimeoutErrorCount of 3 when not provided', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error boundary logging
            const fetchFunction = vi.fn().mockRejectedValue(new Error('Network error'));

            const { getByTestId } = await renderWithErrorBoundary(<TestComponent fetchFunction={fetchFunction} />);

            // Should retry up to 3 times before throwing
            await expect.element(getByTestId('error-message')).toHaveTextContent('Network error');
            expect(fetchFunction).toHaveBeenCalledTimes(3);
        });
    });

    describe('mixed error scenarios', () => {
        it('handles mix of timeout and non-timeout errors independently', async () => {
            const fetchFunction = vi
                .fn()
                .mockRejectedValueOnce(new RequestTimeoutError())
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new RequestTimeoutError())
                .mockResolvedValue({ status: 'ok' });

            const { getByTestId } = await render(<TestComponent fetchFunction={fetchFunction} />);

            await expect.element(getByTestId('isSuccess')).toHaveTextContent('true');
            await expect.element(getByTestId('timeoutErrorCount')).toHaveTextContent('2');
            await expect.element(getByTestId('nonTimeoutErrorCount')).toHaveTextContent('1');
        });

        it('throws ServiceUnavailableError when timeout limit reached even with non-timeout errors', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error boundary logging
            const fetchFunction = vi
                .fn()
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new RequestTimeoutError())
                .mockRejectedValueOnce(new RequestTimeoutError())
                .mockRejectedValue(new RequestTimeoutError());

            const { getByTestId } = await renderWithErrorBoundary(
                <TestComponent fetchFunction={fetchFunction} maxTimeoutErrorCount={3} maxNonTimeoutErrorCount={3} />
            );

            await expect
                .element(getByTestId('error-message'))
                .toHaveTextContent('The service is currently unavailable');
        });

        it('throws non-timeout error when that limit reached even with timeout errors', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error boundary logging
            const networkError = new Error('Network error');
            const fetchFunction = vi
                .fn()
                .mockRejectedValueOnce(new RequestTimeoutError())
                .mockRejectedValueOnce(networkError)
                .mockRejectedValueOnce(networkError)
                .mockRejectedValue(networkError);

            const { getByTestId } = await renderWithErrorBoundary(
                <TestComponent fetchFunction={fetchFunction} maxTimeoutErrorCount={5} maxNonTimeoutErrorCount={3} />
            );

            await expect.element(getByTestId('error-message')).toHaveTextContent('Network error');
        });
    });

    describe('edge cases', () => {
        it('handles non-Error objects thrown by fetchFunction', async () => {
            const fetchFunction = vi.fn().mockRejectedValueOnce('string error').mockResolvedValue({ status: 'ok' });

            const { getByTestId } = await render(<TestComponent fetchFunction={fetchFunction} />);

            await expect.element(getByTestId('isSuccess')).toHaveTextContent('true');
            await expect.element(getByTestId('nonTimeoutErrorCount')).toHaveTextContent('1');
        });

        it('allows custom max error count values', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error boundary logging
            const fetchFunction = vi.fn().mockRejectedValue(new RequestTimeoutError());

            const { getByTestId } = await renderWithErrorBoundary(
                <TestComponent fetchFunction={fetchFunction} maxTimeoutErrorCount={1} />
            );

            await expect
                .element(getByTestId('error-message'))
                .toHaveTextContent('The service is currently unavailable');
        });

        it('handles maxTimeoutErrorCount of 0 by throwing immediately', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error boundary logging
            const fetchFunction = vi.fn().mockRejectedValue(new RequestTimeoutError());

            const { getByTestId } = await renderWithErrorBoundary(
                <TestComponent fetchFunction={fetchFunction} maxTimeoutErrorCount={0} />
            );

            await expect
                .element(getByTestId('error-message'))
                .toHaveTextContent('The service is currently unavailable');
        });

        it('handles maxNonTimeoutErrorCount of 0 by throwing immediately', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error boundary logging
            const fetchFunction = vi.fn().mockRejectedValue(new Error('Network error'));

            const { getByTestId } = await renderWithErrorBoundary(
                <TestComponent fetchFunction={fetchFunction} maxNonTimeoutErrorCount={0} />
            );

            await expect.element(getByTestId('error-message')).toHaveTextContent('Network error');
        });
    });
});
