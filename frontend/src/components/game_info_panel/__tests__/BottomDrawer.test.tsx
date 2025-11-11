import { render } from 'vitest-browser-react';

import * as windowUtilsModule from '../../../utils/window';
import BottomDrawer, { SLIDE_ANIMATION_DURATION_MS, type BottomDrawerProps } from '../BottomDrawer';

vi.mock('../../../hooks/useDismissOnEscape', { spy: true });
vi.mock('../../../utils/window', { spy: true });

describe('BottomDrawer', () => {
    const defaultProps: BottomDrawerProps = {
        onClosingEnd: vi.fn(),
        onStartClosing: vi.fn(),
        shouldClose: false,
        ariaLabel: 'Bottom drawer',
        children: <div>Test Content</div>,
    };

    const renderBottomDrawer = (propOverrides: Partial<BottomDrawerProps> = {}) => {
        return render(<BottomDrawer {...defaultProps} {...propOverrides} />);
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Render and Initial State', () => {
        it('renders children content correctly', async () => {
            const { getByText } = await renderBottomDrawer();

            const childContent = getByText('Test Content');
            await expect.element(childContent).toBeVisible();
        });

        it('renders with correct ARIA attributes', async () => {
            const { getByRole } = await renderBottomDrawer();

            const drawer = getByRole('region', { name: /bottom drawer/i });
            await expect.element(drawer).toBeVisible();
            expect(drawer).toHaveAttribute('aria-label', 'Bottom drawer');
        });

        it('renders close button with ChevronDown icon', async () => {
            const { getByRole } = await renderBottomDrawer();

            const closeButton = getByRole('button', { name: /dismiss/i });
            await expect.element(closeButton).toBeVisible();
            await expect.element(closeButton).toBeEnabled();
        });

        it('applies slide-up animation class when opening (shouldClose=false)', async () => {
            const { getByRole } = await renderBottomDrawer({ shouldClose: false });

            const drawer = getByRole('region', { name: /bottom drawer/i });
            expect(drawer).toHaveClass('animate-slide-up');
            expect(drawer).not.toHaveClass('animate-slide-down');
        });
    });

    describe('User Interactions', () => {
        it('calls onStartClosing when close button is clicked', async () => {
            const onStartClosing = vi.fn();
            const { getByRole } = await renderBottomDrawer({ onStartClosing });

            const closeButton = getByRole('button', { name: /dismiss/i });
            await closeButton.click();

            expect(onStartClosing).toHaveBeenCalledOnce();
        });
    });

    describe('Closing Animation Flow', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('starts closing animation when shouldClose becomes true', async () => {
            const { getByRole, rerender } = await renderBottomDrawer({ shouldClose: false });

            const drawer = getByRole('region', { name: /bottom drawer/i });
            expect(drawer).toHaveClass('animate-slide-up');
            expect(drawer).not.toHaveClass('animate-slide-down');

            await rerender(<BottomDrawer {...defaultProps} shouldClose={true} />);

            expect(drawer).toHaveClass('animate-slide-down');
            expect(drawer).not.toHaveClass('animate-slide-up');
        });

        it('calls onClosingEnd after 300ms when shouldClose becomes true', async () => {
            const onClosingEnd = vi.fn();
            await renderBottomDrawer({ shouldClose: true, onClosingEnd });

            expect(onClosingEnd).not.toHaveBeenCalled();

            vi.advanceTimersByTime(SLIDE_ANIMATION_DURATION_MS);

            expect(onClosingEnd).toHaveBeenCalledOnce();
        });

        it('does not trigger closing flow multiple times', async () => {
            const setTimeoutSpy = vi.spyOn(windowUtilsModule, 'setTimeout');
            const { rerender } = await renderBottomDrawer({ shouldClose: true });

            expect(setTimeoutSpy).toHaveBeenCalledOnce();

            await rerender(<BottomDrawer {...defaultProps} shouldClose={true} />);

            expect(setTimeoutSpy).toHaveBeenCalledOnce();
        });

        it('does not start closing when already closing', async () => {
            const setTimeoutSpy = vi.spyOn(windowUtilsModule, 'setTimeout');
            const { rerender } = await renderBottomDrawer({ shouldClose: false });

            expect(setTimeoutSpy).not.toHaveBeenCalled();

            await rerender(<BottomDrawer {...defaultProps} shouldClose={true} />);

            expect(setTimeoutSpy).toHaveBeenCalledOnce();

            await rerender(<BottomDrawer {...defaultProps} shouldClose={true} />);

            expect(setTimeoutSpy).toHaveBeenCalledOnce();
        });
    });

    describe('Timer Management', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('cleans up timer on unmount during closing animation', async () => {
            const clearTimeoutSpy = vi.spyOn(windowUtilsModule, 'clearTimeout');
            const { unmount } = await renderBottomDrawer({ shouldClose: true });

            expect(clearTimeoutSpy).not.toHaveBeenCalled();

            unmount();

            expect(clearTimeoutSpy).toHaveBeenCalledOnce();
        });

        it('no timer cleanup if component unmounts without closing', async () => {
            const clearTimeoutSpy = vi.spyOn(windowUtilsModule, 'clearTimeout');
            const { unmount } = await renderBottomDrawer({ shouldClose: false });

            unmount();

            expect(clearTimeoutSpy).not.toHaveBeenCalled();
        });
    });
});
