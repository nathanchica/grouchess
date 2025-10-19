import type { ReactNode } from 'react';

type Props = {
    children: ReactNode;
    tooltipText: string;
};

function TooltipContainer({ children, tooltipText }: Props) {
    return (
        <div className="relative group inline-block">
            {children}
            <span
                role="tooltip"
                className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-2 py-1 text-xs text-zinc-100 opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
            >
                {tooltipText}
            </span>
        </div>
    );
}

export default TooltipContainer;
