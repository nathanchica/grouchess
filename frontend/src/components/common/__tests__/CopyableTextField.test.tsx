import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import CopyableTextField from '../CopyableTextField';

describe('CopyableTextField', () => {
    const defaultProps = {
        text: 'https://example.com/game/12345',
        label: 'Game Link',
        id: 'game-link-field',
        copyButtonAriaLabel: 'Copy game link',
    };

    let writeTextSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.useFakeTimers();
        writeTextSpy = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
            value: {
                writeText: writeTextSpy,
            },
            writable: true,
            configurable: true,
        });
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
    });

    describe('rendering', () => {
        it('renders label with correct text', async () => {
            const { getByText } = await render(<CopyableTextField {...defaultProps} />);

            await expect.element(getByText('Game Link')).toBeInTheDocument();
        });

        it('renders input field with correct value', async () => {
            const { getByRole } = await render(<CopyableTextField {...defaultProps} />);

            const input = getByRole('textbox', { name: 'Game Link' });
            await expect.element(input).toHaveValue('https://example.com/game/12345');
        });

        it('renders input as read-only', async () => {
            const { getByRole } = await render(<CopyableTextField {...defaultProps} />);

            const input = getByRole('textbox', { name: 'Game Link' });
            await expect.element(input).toHaveAttribute('readonly');
        });

        it('renders copy button with correct aria-label', async () => {
            const { getByRole } = await render(<CopyableTextField {...defaultProps} />);

            const button = getByRole('button', { name: 'Copy game link' });
            await expect.element(button).toBeInTheDocument();
        });

        it('does not show "Copied!" message initially', async () => {
            const { container } = await render(<CopyableTextField {...defaultProps} />);

            const status = container.querySelector('[role="status"]');
            expect(status?.getAttribute('aria-live')).toBe('off');
            expect(status?.getAttribute('aria-hidden')).toBe('true');
        });
    });

    describe('copy functionality', () => {
        it('copies text to clipboard when button is clicked', async () => {
            const { getByRole } = await render(<CopyableTextField {...defaultProps} />);

            const button = getByRole('button', { name: 'Copy game link' });
            await userEvent.click(button);

            expect(writeTextSpy).toHaveBeenCalledWith('https://example.com/game/12345');
            expect(writeTextSpy).toHaveBeenCalledTimes(1);
        });

        it('shows "Copied!" message after successful copy', async () => {
            const { container, getByText } = await render(<CopyableTextField {...defaultProps} />);

            const button = page.getByRole('button', { name: 'Copy game link' });
            await button.click();

            const status = container.querySelector('[role="status"]');
            expect(status?.getAttribute('aria-live')).toBe('polite');
            expect(status?.getAttribute('aria-hidden')).toBe('false');
            await expect.element(getByText('Copied!')).toBeInTheDocument();
        });

        it('hides "Copied!" message after 2 seconds', async () => {
            const { container, getByText } = await render(<CopyableTextField {...defaultProps} />);

            const button = page.getByRole('button', { name: 'Copy game link' });
            await button.click();

            // Message should be visible immediately
            await expect.element(getByText('Copied!')).toBeInTheDocument();

            // Fast-forward 2 seconds
            await vi.advanceTimersByTimeAsync(2000);

            // Wait for the status to be hidden
            const status = container.querySelector('[role="status"]');
            await vi.waitFor(() => {
                expect(status?.getAttribute('aria-live')).toBe('off');
                expect(status?.getAttribute('aria-hidden')).toBe('true');
            });
        });

        it('clears previous timeout when button is clicked multiple times rapidly', async () => {
            const { container } = await render(<CopyableTextField {...defaultProps} />);

            const button = page.getByRole('button', { name: 'Copy game link' });

            // First click
            await button.click();
            await vi.advanceTimersByTimeAsync(1000);

            // Second click before timeout completes
            await button.click();
            await vi.advanceTimersByTimeAsync(1500);

            // Should still show "Copied!" (only 1.5s after second click)
            let status = container.querySelector('[role="status"]');
            expect(status?.getAttribute('aria-live')).toBe('polite');

            // Complete the remaining 500ms
            await vi.advanceTimersByTimeAsync(500);

            // Now should be hidden (2s after second click)
            status = container.querySelector('[role="status"]');
            await vi.waitFor(() => {
                expect(status?.getAttribute('aria-live')).toBe('off');
            });

            // writeText should have been called twice
            expect(writeTextSpy).toHaveBeenCalledTimes(2);
        });

        it('handles clipboard API failure gracefully', async () => {
            writeTextSpy.mockRejectedValueOnce(new Error('Clipboard access denied'));
            const { container } = await render(<CopyableTextField {...defaultProps} />);

            const button = page.getByRole('button', { name: 'Copy game link' });
            await button.click();

            // Should not show "Copied!" message on failure
            const status = container.querySelector('[role="status"]');
            expect(status?.getAttribute('aria-live')).toBe('off');
            expect(status?.getAttribute('aria-hidden')).toBe('true');
        });
    });

    describe('input interactions', () => {
        it('selects text when input is focused', async () => {
            const { container } = await render(<CopyableTextField {...defaultProps} />);

            const input = container.querySelector('input') as HTMLInputElement;
            await input.focus();

            // Check that text is selected using selectionStart and selectionEnd
            expect(input.selectionStart).toBe(0);
            expect(input.selectionEnd).toBe(defaultProps.text.length);
        });

        it('allows keyboard focus on copy button', async () => {
            const { getByRole } = await render(<CopyableTextField {...defaultProps} />);

            const button = getByRole('button', { name: 'Copy game link' });
            await button.click();

            await expect.element(button).toHaveFocus();
        });
    });

    describe('cleanup', () => {
        it('clears timeout on unmount', async () => {
            const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
            const { unmount } = await render(<CopyableTextField {...defaultProps} />);

            // Click to start timer
            const button = page.getByRole('button', { name: 'Copy game link' });
            await button.click();

            unmount();

            expect(clearTimeoutSpy).toHaveBeenCalled();
            clearTimeoutSpy.mockRestore();
        });
    });

    describe('accessibility', () => {
        it('associates label with input via htmlFor and id', async () => {
            const { container } = await render(<CopyableTextField {...defaultProps} />);

            const label = container.querySelector('label');
            const input = container.querySelector('input');

            expect(label?.getAttribute('for')).toBe('game-link-field');
            expect(input?.getAttribute('id')).toBe('game-link-field');
        });

        it('uses aria-live="polite" for status message when copied', async () => {
            const { container } = await render(<CopyableTextField {...defaultProps} />);

            const button = page.getByRole('button', { name: 'Copy game link' });
            await button.click();

            const status = container.querySelector('[role="status"]');
            expect(status?.getAttribute('aria-live')).toBe('polite');
        });

        it('marks icon as aria-hidden', async () => {
            const { container } = await render(<CopyableTextField {...defaultProps} />);

            const icon = container.querySelector('svg');
            expect(icon?.getAttribute('aria-hidden')).toBe('true');
        });

        it('has button type="button" to prevent form submission', async () => {
            const { getByRole } = await render(<CopyableTextField {...defaultProps} />);

            const button = getByRole('button', { name: 'Copy game link' });
            await expect.element(button).toHaveAttribute('type', 'button');
        });
    });

    describe('edge cases', () => {
        it('works with empty text', async () => {
            const { getByRole } = await render(<CopyableTextField {...defaultProps} text="" />);

            const input = getByRole('textbox', { name: 'Game Link' });
            await expect.element(input).toHaveValue('');

            const button = page.getByRole('button', { name: 'Copy game link' });
            await button.click();

            expect(writeTextSpy).toHaveBeenCalledWith('');
        });

        it('works with very long text', async () => {
            const longText = 'x'.repeat(1000);
            await render(<CopyableTextField {...defaultProps} text={longText} />);

            const button = page.getByRole('button', { name: 'Copy game link' });
            await button.click();

            expect(writeTextSpy).toHaveBeenCalledWith(longText);
        });

        it('updates copied text when text prop changes', async () => {
            const { rerender } = await render(<CopyableTextField {...defaultProps} />);

            const button = page.getByRole('button', { name: 'Copy game link' });
            await button.click();
            expect(writeTextSpy).toHaveBeenCalledWith('https://example.com/game/12345');

            await rerender(<CopyableTextField {...defaultProps} text="new-text" />);
            await button.click();
            expect(writeTextSpy).toHaveBeenCalledWith('new-text');
        });
    });
});
