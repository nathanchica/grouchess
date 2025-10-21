import { cloneElement, useId } from 'react';
import type { ReactElement } from 'react';

type Props = {
    children: ReactElement;
    tooltipText: string;
};

type ChildrenPropsWithAriaDescribedBy = {
    'aria-describedby'?: string;
};

function TooltipContainer({ children, tooltipText }: Props) {
    const tooltipId = useId();
    const existingDescribedBy = (children.props as ChildrenPropsWithAriaDescribedBy)['aria-describedby'] as
        | string
        | undefined;
    const describedBy = existingDescribedBy ? `${existingDescribedBy} ${tooltipId}`.trim() : tooltipId;
    const enhancedTrigger = cloneElement(children, {
        'aria-describedby': describedBy,
    } as ChildrenPropsWithAriaDescribedBy);

    return (
        <span className="relative group inline-block">
            {enhancedTrigger}
            <span
                id={tooltipId}
                role="tooltip"
                className="z-40 pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-2 py-1 text-xs text-zinc-100 opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
            >
                {tooltipText}
            </span>
        </span>
    );
}

export default TooltipContainer;
