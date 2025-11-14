import { renderHook } from 'vitest-browser-react';

import { useDismissOnEscape } from '../useDismissOnEscape';

describe('useDismissOnEscape', () => {
    it('calls onDismiss when the Escape key is pressed', async () => {
        const onDismiss = vi.fn();
        await renderHook(() => useDismissOnEscape(onDismiss));

        const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(escapeEvent);

        expect(onDismiss).toHaveBeenCalledOnce();
    });

    it.each([
        { key: 'Enter', description: 'Enter key' },
        { key: 'Space', description: 'Space key' },
        { key: 'Tab', description: 'Tab key' },
        { key: 'a', description: 'letter key' },
        { key: 'ArrowUp', description: 'arrow key' },
    ])('does not call onDismiss for $description', async ({ key }) => {
        const onDismiss = vi.fn();
        await renderHook(() => useDismissOnEscape(onDismiss));

        const event = new KeyboardEvent('keydown', { key });
        document.dispatchEvent(event);

        expect(onDismiss).not.toHaveBeenCalled();
    });

    it('removes the keydown listener on cleanup', async () => {
        const onDismiss = vi.fn();
        const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
        const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

        const { unmount } = await renderHook(() => useDismissOnEscape(onDismiss));

        expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

        // Verify that the listener is actually removed by dispatching an event
        const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(escapeEvent);

        expect(onDismiss).not.toHaveBeenCalled();
    });

    it('updates the event handler when onDismiss changes', async () => {
        const firstOnDismiss = vi.fn();
        const secondOnDismiss = vi.fn();

        const { rerender } = await renderHook(
            (props?: { callback: () => void }) => useDismissOnEscape(props?.callback ?? (() => {})),
            {
                initialProps: { callback: firstOnDismiss },
            }
        );

        // Trigger Escape with first callback
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        expect(firstOnDismiss).toHaveBeenCalledOnce();
        expect(secondOnDismiss).not.toHaveBeenCalled();

        // Rerender with second callback
        await rerender({ callback: secondOnDismiss });

        // Trigger Escape with second callback
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        expect(firstOnDismiss).toHaveBeenCalledOnce();
        expect(secondOnDismiss).toHaveBeenCalledOnce();
    });
});
