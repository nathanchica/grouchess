import type { ReactNode, AriaAttributes } from 'react';

import TooltipContainer from './TooltipContainer';

export type IconButtonProps = {
    icon: ReactNode;
    onClick: () => void;
    ariaProps?: AriaAttributes;
    isActive?: boolean;
    tooltipText: string;
    disabled?: boolean;
};

function IconButton({ icon, onClick, ariaProps, isActive, tooltipText, disabled }: IconButtonProps) {
    return (
        <TooltipContainer tooltipText={tooltipText}>
            <button
                type="button"
                onClick={onClick}
                disabled={disabled}
                {...ariaProps}
                className={`cursor-pointer ${isActive ? 'text-zinc-100' : 'text-zinc-400 hover:text-zinc-100'} disabled:opacity-50 disabled:pointer-events-none transition`}
            >
                {icon}
            </button>
        </TooltipContainer>
    );
}

export default IconButton;
