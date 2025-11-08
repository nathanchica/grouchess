import { render } from 'vitest-browser-react';

import * as useFetchWithRetryModule from '../../../hooks/useFetchWithRetry';
import * as configModule from '../../../utils/config';
import * as healthModule from '../../../utils/health';
import ServiceHealthCheckView from '../ServiceHealthCheckView';

vi.mock('../../../hooks/useFetchWithRetry', { spy: true });
vi.mock('../../../utils/config', { spy: true });
vi.mock('../../../utils/health', { spy: true });

describe('ServiceHealthCheckView', () => {
    const defaultEnv = {
        VITE_SERVICE_HEALTH_CHECK_REQUEST_TIMEOUT_MS: 5000,
        VITE_SERVICE_HEALTH_CHECK_MAX_TIMEOUT_ERROR_COUNT: 12,
        VITE_SERVICE_HEALTH_CHECK_MAX_NON_TIMEOUT_ERROR_COUNT: 3,
    };

    beforeEach(() => {
        vi.spyOn(configModule, 'getEnv').mockReturnValue(defaultEnv as unknown as configModule.Env);
        vi.spyOn(useFetchWithRetryModule, 'useFetchWithRetry').mockReturnValue({
            isSuccess: false,
            timeoutErrorCount: 0,
            nonTimeoutErrorCount: 0,
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering States', () => {
        it('renders loading UI when health check is pending', async () => {
            const { getByRole, getByText } = await render(<ServiceHealthCheckView onHealthy={vi.fn()} />);

            await expect.element(getByRole('img', { name: /sleeping cat/i })).toBeVisible();
            await expect.element(getByRole('status')).toBeVisible();
            await expect.element(getByText(/waking up the server/i)).toBeVisible();
            await expect.element(getByText(/please wait.*up to ~60 seconds/i)).toBeVisible();
        });

        it('returns null when health check succeeds', async () => {
            vi.spyOn(useFetchWithRetryModule, 'useFetchWithRetry').mockReturnValue({
                isSuccess: true,
                timeoutErrorCount: 0,
                nonTimeoutErrorCount: 0,
            });

            const { container } = await render(<ServiceHealthCheckView onHealthy={vi.fn()} />);

            expect(container).toBeEmptyDOMElement();
        });

        it.each([
            {
                scenario: 'long timeout configuration',
                requestTimeoutMs: 5000,
                maxTimeoutErrorCount: 12,
                expectedWaitSecs: 60,
            },
            {
                scenario: 'medium timeout configuration',
                requestTimeoutMs: 3000,
                maxTimeoutErrorCount: 10,
                expectedWaitSecs: 30,
            },
            {
                scenario: 'short timeout configuration',
                requestTimeoutMs: 1000,
                maxTimeoutErrorCount: 5,
                expectedWaitSecs: 5,
            },
        ])(
            'displays wait time of $expectedWaitSecs seconds with $scenario',
            async ({ requestTimeoutMs, maxTimeoutErrorCount, expectedWaitSecs }) => {
                vi.spyOn(configModule, 'getEnv').mockReturnValue({
                    ...defaultEnv,
                    VITE_SERVICE_HEALTH_CHECK_REQUEST_TIMEOUT_MS: requestTimeoutMs,
                    VITE_SERVICE_HEALTH_CHECK_MAX_TIMEOUT_ERROR_COUNT: maxTimeoutErrorCount,
                } as unknown as configModule.Env);

                const { getByText } = await render(<ServiceHealthCheckView onHealthy={vi.fn()} />);

                await expect.element(getByText(new RegExp(`up to ~${expectedWaitSecs} seconds`, 'i'))).toBeVisible();
            }
        );
    });

    describe('Health Check Callback', () => {
        it('calls onHealthy when health check succeeds immediately', async () => {
            vi.spyOn(useFetchWithRetryModule, 'useFetchWithRetry').mockReturnValue({
                isSuccess: true,
                timeoutErrorCount: 0,
                nonTimeoutErrorCount: 0,
            });

            const onHealthy = vi.fn();
            await render(<ServiceHealthCheckView onHealthy={onHealthy} />);

            expect(onHealthy).toHaveBeenCalledTimes(1);
        });

        it('calls onHealthy when health check succeeds after retries', async () => {
            const onHealthy = vi.fn();

            // Start with pending state
            const mockUseFetchWithRetry = vi.spyOn(useFetchWithRetryModule, 'useFetchWithRetry').mockReturnValue({
                isSuccess: false,
                timeoutErrorCount: 2,
                nonTimeoutErrorCount: 0,
            });

            const { rerender } = await render(<ServiceHealthCheckView onHealthy={onHealthy} />);

            expect(onHealthy).not.toHaveBeenCalled();

            // Update to success state
            mockUseFetchWithRetry.mockReturnValue({
                isSuccess: true,
                timeoutErrorCount: 2,
                nonTimeoutErrorCount: 0,
            });

            await rerender(<ServiceHealthCheckView onHealthy={onHealthy} />);

            expect(onHealthy).toHaveBeenCalledTimes(1);
        });

        it('does not call onHealthy when health check is pending', async () => {
            vi.spyOn(useFetchWithRetryModule, 'useFetchWithRetry').mockReturnValue({
                isSuccess: false,
                timeoutErrorCount: 1,
                nonTimeoutErrorCount: 0,
            });

            const onHealthy = vi.fn();
            await render(<ServiceHealthCheckView onHealthy={onHealthy} />);

            expect(onHealthy).not.toHaveBeenCalled();
        });
    });

    describe('Configuration and Dependencies', () => {
        it('uses correct environment configuration values', async () => {
            const customEnv = {
                VITE_SERVICE_HEALTH_CHECK_REQUEST_TIMEOUT_MS: 3000,
                VITE_SERVICE_HEALTH_CHECK_MAX_TIMEOUT_ERROR_COUNT: 8,
                VITE_SERVICE_HEALTH_CHECK_MAX_NON_TIMEOUT_ERROR_COUNT: 5,
            };

            vi.spyOn(configModule, 'getEnv').mockReturnValue(customEnv as unknown as configModule.Env);
            const mockUseFetchWithRetry = vi.spyOn(useFetchWithRetryModule, 'useFetchWithRetry');

            await render(<ServiceHealthCheckView onHealthy={vi.fn()} />);

            expect(mockUseFetchWithRetry).toHaveBeenCalledWith({
                fetchFunction: expect.any(Function),
                maxTimeoutErrorCount: 8,
                maxNonTimeoutErrorCount: 5,
            });
        });

        it('creates fetchHealth callback with correct timeout', async () => {
            const customEnv = {
                ...defaultEnv,
                VITE_SERVICE_HEALTH_CHECK_REQUEST_TIMEOUT_MS: 7500,
            };

            vi.spyOn(configModule, 'getEnv').mockReturnValue(customEnv as unknown as configModule.Env);
            const mockFetchParsedHealthStatus = vi.spyOn(healthModule, 'fetchParsedHealthStatus').mockResolvedValue({
                status: 'healthy',
                service: 'test-service',
                uptime: 12345,
                timestamp: new Date(),
            });
            const mockUseFetchWithRetry = vi.spyOn(useFetchWithRetryModule, 'useFetchWithRetry');

            await render(<ServiceHealthCheckView onHealthy={vi.fn()} />);

            // Get the fetchFunction that was passed to useFetchWithRetry
            const fetchFunction = mockUseFetchWithRetry.mock.calls[0][0].fetchFunction;

            // Call the fetchFunction to verify it calls fetchParsedHealthStatus with correct timeout
            await fetchFunction();

            expect(mockFetchParsedHealthStatus).toHaveBeenCalledWith({ timeoutMs: 7500 });
        });
    });

    describe('Accessibility', () => {
        it('provides status role for loading state', async () => {
            const { getByRole } = await render(<ServiceHealthCheckView onHealthy={vi.fn()} />);

            const statusElement = getByRole('status');
            await expect.element(statusElement).toBeInTheDocument();
            await expect.element(statusElement).toBeVisible();
        });

        it('provides descriptive alt text for loading image', async () => {
            const { getByRole } = await render(<ServiceHealthCheckView onHealthy={vi.fn()} />);

            const image = getByRole('img', { name: /sleeping cat/i });
            await expect.element(image).toBeInTheDocument();
            await expect.element(image).toHaveAttribute('alt', 'Sleeping cat');
        });
    });

    describe('Edge Cases', () => {
        it('handles minimum timeout configuration correctly', async () => {
            vi.spyOn(configModule, 'getEnv').mockReturnValue({
                ...defaultEnv,
                VITE_SERVICE_HEALTH_CHECK_REQUEST_TIMEOUT_MS: 1000,
                VITE_SERVICE_HEALTH_CHECK_MAX_TIMEOUT_ERROR_COUNT: 1,
            } as unknown as configModule.Env);

            const { getByText } = await render(<ServiceHealthCheckView onHealthy={vi.fn()} />);

            await expect.element(getByText(/up to ~1 seconds/i)).toBeVisible();
        });

        it('handles large timeout configuration correctly', async () => {
            vi.spyOn(configModule, 'getEnv').mockReturnValue({
                ...defaultEnv,
                VITE_SERVICE_HEALTH_CHECK_REQUEST_TIMEOUT_MS: 10000,
                VITE_SERVICE_HEALTH_CHECK_MAX_TIMEOUT_ERROR_COUNT: 18,
            } as unknown as configModule.Env);

            const { getByText } = await render(<ServiceHealthCheckView onHealthy={vi.fn()} />);

            await expect.element(getByText(/up to ~180 seconds/i)).toBeVisible();
        });
    });
});
