import { type MoveNotation } from '@grouchess/models';

const MOVE_HISTORY_BASE_CLASSES = 'text-zinc-200 tabular-nums whitespace-nowrap';
const ACTIVE_MOVE_CLASSES = 'font-bold text-zinc-100';
const MOVE_CELL_CLASSES = 'hover:bg-white/10 cursor-pointer px-2 py-0.5 rounded-md';

export type MoveHistoryTableRowProps = {
    movePair: MoveNotation[];
    moveNumber: number;
    isLastRow: boolean;
    lastMoveIsBlack: boolean;
    notationStyle?: keyof MoveNotation;
};

function MoveHistoryTableRow({
    movePair,
    moveNumber,
    isLastRow,
    lastMoveIsBlack,
    notationStyle = 'figurine',
}: MoveHistoryTableRowProps) {
    const [whiteMove, blackMove] = movePair;

    const isWhiteHighlighted = isLastRow && !lastMoveIsBlack;
    const isBlackHighlighted = isLastRow && lastMoveIsBlack;

    const whiteClasses = `${MOVE_HISTORY_BASE_CLASSES} ${isWhiteHighlighted ? ACTIVE_MOVE_CLASSES : ''}`;
    const blackClasses = `${MOVE_HISTORY_BASE_CLASSES} ${isBlackHighlighted ? ACTIVE_MOVE_CLASSES : ''}`;

    return (
        <tr>
            <td>
                <span className={`${MOVE_HISTORY_BASE_CLASSES} text-zinc-400 text-center`}>{moveNumber}.</span>
            </td>
            <td className={MOVE_CELL_CLASSES}>
                <span
                    className={whiteClasses}
                    aria-label={whiteMove.san}
                    {...(isWhiteHighlighted ? { 'aria-current': 'step' } : {})}
                >
                    {whiteMove[notationStyle] ?? whiteMove.san}
                </span>
            </td>
            <td {...(blackMove ? { className: MOVE_CELL_CLASSES } : {})}>
                {blackMove ? (
                    <span
                        className={blackClasses}
                        aria-label={blackMove.san}
                        {...(isBlackHighlighted ? { 'aria-current': 'step' } : {})}
                    >
                        {blackMove[notationStyle] ?? blackMove.san}
                    </span>
                ) : (
                    <span className={`${MOVE_HISTORY_BASE_CLASSES} invisible`}>—</span>
                )}
            </td>
        </tr>
    );
}

export default MoveHistoryTableRow;
