import type { ReactNode, AriaAttributes } from 'react';

import TooltipContainer from './TooltipContainer';

export type IconButtonProps = {
    icon: ReactNode;
    onClick: () => void;
    ariaProps?: AriaAttributes;
    isActive?: boolean;
    tooltipText: string;
};

function IconButton({ icon, onClick, ariaProps, isActive, tooltipText }: IconButtonProps) {
    return (
        <TooltipContainer tooltipText={tooltipText}>
            <button
                type="button"
                onClick={onClick}
                {...ariaProps}
                className={`cursor-pointer ${isActive ? 'text-zinc-100' : 'text-zinc-400 hover:text-zinc-100'} transition`}
            >
                {icon}
            </button>
        </TooltipContainer>
    );
}

export default IconButton;
