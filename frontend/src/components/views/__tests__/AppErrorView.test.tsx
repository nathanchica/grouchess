import * as Sentry from '@sentry/react';
import { render } from 'vitest-browser-react';

import AppErrorView from '../AppErrorView';

vi.mock(import('@sentry/react'), () => ({
    captureException: vi.fn(),
}));

describe('AppErrorView', () => {
    const mockError = new Error('Test error');
    const defaultProps = {
        error: mockError,
        resetErrorBoundary: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Sentry Integration', () => {
        it('reports the thrown error to Sentry when the fallback renders', async () => {
            await render(<AppErrorView {...defaultProps} />);

            expect(Sentry.captureException).toHaveBeenCalledTimes(1);
            expect(Sentry.captureException).toHaveBeenCalledWith(mockError);
        });

        it('captures different error types', async () => {
            const customError = new TypeError('Custom type error');
            await render(<AppErrorView {...defaultProps} error={customError} />);

            expect(Sentry.captureException).toHaveBeenCalledWith(customError);
        });
    });

    describe('Render', () => {
        it('renders complete error UI structure', async () => {
            const { getByRole, getByText } = await render(<AppErrorView {...defaultProps} />);

            // Header
            const heading = getByRole('heading', { name: /grouchess/i });
            await expect.element(heading).toBeVisible();

            // Tagline
            const tagline = getByText(/grouchess is a Lichess-clone project just for fun and learning/i);
            await expect.element(tagline).toBeVisible();

            // Error heading
            const errorHeading = getByRole('heading', { name: /uh oh!/i });
            await expect.element(errorHeading).toBeVisible();

            // Error message
            const errorMessage = getByText(/something went terribly wrong. please try again later/i);
            await expect.element(errorMessage).toBeVisible();
        });

        it('renders home link with correct href', async () => {
            const { getByRole } = await render(<AppErrorView {...defaultProps} />);

            const homeLink = getByRole('link', { name: /grouchess/i });
            await expect.element(homeLink).toBeVisible();
            await expect.element(homeLink).toHaveAttribute('href', '/');
        });
    });

    describe('Images', () => {
        it('renders rook logo with correct src and alt text', async () => {
            const { getByRole } = await render(<AppErrorView {...defaultProps} />);

            const images = getByRole('img').elements();
            const rookImage = images.find((img) => img.getAttribute('alt') === 'White Rook');

            expect(rookImage).toBeDefined();
            expect(rookImage?.getAttribute('src')).toBe('/pieces/staunty/wR.svg');
            expect(rookImage?.getAttribute('alt')).toBe('White Rook');
        });

        it('renders cat walking gif with correct src and alt text', async () => {
            const { getByRole } = await render(<AppErrorView {...defaultProps} />);

            const catImage = getByRole('img', { name: /cat walking in a circle/i });
            await expect.element(catImage).toBeVisible();
            await expect.element(catImage).toHaveAttribute('src', '/gifs/gatito_dar_vueltasx3.gif');
            await expect.element(catImage).toHaveAttribute('alt', 'Cat walking in a circle');
        });

        it('renders tower fall illustration with correct src and alt text', async () => {
            const { getByRole } = await render(<AppErrorView {...defaultProps} />);

            const towerImage = getByRole('img', { name: /tower fall illustration/i });
            await expect.element(towerImage).toBeVisible();
            await expect.element(towerImage).toHaveAttribute('src', '/images/tower-fall.svg');
            await expect.element(towerImage).toHaveAttribute('alt', 'Tower fall illustration');
        });

        it('renders all three images', async () => {
            const { getByRole } = await render(<AppErrorView {...defaultProps} />);

            const images = getByRole('img').elements();
            expect(images.length).toBe(3);
        });
    });
});
