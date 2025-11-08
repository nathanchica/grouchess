import { NotConfiguredError, ServiceUnavailableError } from '@grouchess/errors';
import * as Sentry from '@sentry/react';
import { render } from 'vitest-browser-react';

import ErrorView from '../ErrorView';

vi.mock('@sentry/react', () => ({
    captureException: vi.fn(),
}));

describe('ErrorView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Error Type Recognition and Display', () => {
        it.each([
            {
                scenario: 'NotConfiguredError',
                error: new NotConfiguredError('API endpoint not configured'),
                expectedHeader: 'Configuration error',
                expectedMessage: 'Not configured: API endpoint not configured',
            },
            {
                scenario: 'ServiceUnavailableError',
                error: new ServiceUnavailableError(),
                expectedHeader: 'Service unavailable',
                expectedMessage: 'The service may be down. Please try again later.',
            },
            {
                scenario: 'Generic Error',
                error: new Error('Something went wrong'),
                expectedHeader: 'Oh no!',
                expectedMessage: 'Oops, something went wrong. Please try again later.',
            },
        ])('displays correct UI for $scenario', async ({ error, expectedHeader, expectedMessage }) => {
            const { getByRole, getByText } = await render(<ErrorView error={error} resetErrorBoundary={vi.fn()} />);

            const heading = getByRole('heading', { name: expectedHeader });
            await expect.element(heading).toBeVisible();

            const message = getByText(expectedMessage);
            await expect.element(message).toBeVisible();
        });
    });

    describe('Sentry Integration', () => {
        it.each([
            {
                scenario: 'NotConfiguredError',
                error: new NotConfiguredError('API endpoint not configured'),
            },
            {
                scenario: 'ServiceUnavailableError',
                error: new ServiceUnavailableError(),
            },
            {
                scenario: 'Generic Error',
                error: new Error('Something went wrong'),
            },
        ])('captures exception with Sentry for $scenario', async ({ error }) => {
            await render(<ErrorView error={error} resetErrorBoundary={vi.fn()} />);

            expect(Sentry.captureException).toHaveBeenCalledTimes(1);
            expect(Sentry.captureException).toHaveBeenCalledWith(error);
        });
    });

    describe('UI Structure and Accessibility', () => {
        it('renders complete error UI structure', async () => {
            const error = new Error('Test error');
            const { getByRole, getByText } = await render(<ErrorView error={error} resetErrorBoundary={vi.fn()} />);

            const heading = getByRole('heading', { name: 'Oh no!' });
            await expect.element(heading).toBeVisible();

            const message = getByText('Oops, something went wrong. Please try again later.');
            await expect.element(message).toBeVisible();

            const image = getByRole('img', { name: /tower fall illustration/i });
            await expect.element(image).toBeVisible();
        });

        it('displays error illustration with proper alt text', async () => {
            const error = new Error('Test error');
            const { getByRole } = await render(<ErrorView error={error} resetErrorBoundary={vi.fn()} />);

            const image = getByRole('img', { name: /tower fall illustration/i });
            await expect.element(image).toBeVisible();
            await expect.element(image).toHaveAttribute('alt', 'Tower fall illustration');
        });
    });

    describe('Edge Cases', () => {
        it('handles NotConfiguredError with empty message', async () => {
            const error = new NotConfiguredError('');
            const { getByRole, getByText } = await render(<ErrorView error={error} resetErrorBoundary={vi.fn()} />);

            const heading = getByRole('heading', { name: 'Configuration error' });
            await expect.element(heading).toBeVisible();

            const message = getByText('Not configured: ');
            await expect.element(message).toBeVisible();
        });

        it('handles NotConfiguredError with very long message', async () => {
            const longMessage = 'A'.repeat(500);
            const error = new NotConfiguredError(longMessage);
            const { getByRole, getByText } = await render(<ErrorView error={error} resetErrorBoundary={vi.fn()} />);

            const heading = getByRole('heading', { name: 'Configuration error' });
            await expect.element(heading).toBeVisible();

            const message = getByText(`Not configured: ${longMessage}`);
            await expect.element(message).toBeVisible();
        });
    });
});
