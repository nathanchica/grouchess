import { useEffect, useRef, type ReactNode } from 'react';

import ChevronDownIcon from '../../assets/icons/chevron-down.svg?react';
import { useDismissOnEscape } from '../../hooks/useDismissOnEscape';
import { clearTimeout, setTimeout } from '../../utils/window';
import IconButton from '../common/IconButton';

// Match with CSS animation duration
export const SLIDE_ANIMATION_DURATION_MS = 300;

export type BottomDrawerProps = {
    onClosingEnd: () => void;
    onStartClosing: () => void;
    shouldClose?: boolean;
    ariaLabel: string;
    children: ReactNode;
};

function BottomDrawer({ onClosingEnd, onStartClosing, shouldClose, ariaLabel, children }: BottomDrawerProps) {
    const isClosingRef = useRef(false);
    const timerRef = useRef<number | null>(null);

    useDismissOnEscape(onStartClosing);

    // When parent signals to close, start the animation and timer
    useEffect(() => {
        if (shouldClose && !isClosingRef.current) {
            isClosingRef.current = true;
            timerRef.current = setTimeout(() => {
                onClosingEnd();
            }, SLIDE_ANIMATION_DURATION_MS);
        }
    }, [shouldClose, onClosingEnd]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return (
        <section
            id="bottom-drawer"
            role="region"
            className={`absolute bottom-0 left-0 right-0 z-10 bg-zinc-950/30 min-h-[260px] backdrop-blur-md rounded-t-md flex flex-col items-center gap-2 px-4 pb-8 pt-2 ${shouldClose ? 'animate-slide-down' : 'animate-slide-up'}`}
            aria-label={ariaLabel}
        >
            <IconButton
                icon={<ChevronDownIcon className="size-5" />}
                ariaProps={{ 'aria-label': 'Dismiss' }}
                onClick={onStartClosing}
            />
            {children}
        </section>
    );
}

export default BottomDrawer;
