import { useCallback, useEffect } from 'react';

export function useDismissOnEscape(onDismiss: () => void) {
    const handleKeyDownEvent = useCallback(
        (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onDismiss();
            }
        },
        [onDismiss]
    );

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDownEvent);
        return () => document.removeEventListener('keydown', handleKeyDownEvent);
    }, [handleKeyDownEvent]);
}
