import { memo, type ReactNode } from 'react';

export type LegendsProps = {
    colLegend?: string;
    rowLegend?: string;
    isDarkSquare: boolean;
    isPreviousMoveSquare: boolean;
};

/**
 * Renders the row and column legends for a chess square.
 */
function Legends({ colLegend, rowLegend, isDarkSquare, isPreviousMoveSquare }: LegendsProps) {
    let legendFontColor = isDarkSquare ? 'text-zinc-100' : 'text-zinc-500';
    if (isPreviousMoveSquare) legendFontColor = 'text-zinc-500';
    const legendBaseClasses = `absolute text-xs font-bold pointer-events-none ${legendFontColor}`;

    let rowLegendContent: ReactNode = null;
    if (rowLegend) {
        rowLegendContent = (
            <span aria-hidden="true" data-testid="row-legend" className={`${legendBaseClasses} top-1 left-1`}>
                {rowLegend}
            </span>
        );
    }

    let colLegendContent: ReactNode = null;
    if (colLegend) {
        colLegendContent = (
            <span aria-hidden="true" data-testid="col-legend" className={`${legendBaseClasses} bottom-1 right-1.5`}>
                {colLegend}
            </span>
        );
    }

    if (!rowLegendContent && !colLegendContent) {
        return null;
    }

    return (
        <>
            {rowLegendContent}
            {colLegendContent}
        </>
    );
}

export default memo(Legends);
