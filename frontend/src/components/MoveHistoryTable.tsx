import { useEffect, useRef } from 'react';

import { useChessGame } from '../providers/ChessGameProvider';
import { getDisplayTextForDrawStatus, isDrawStatus } from '../utils/draws';
import { type MoveNotation } from '../utils/notations';

function createMovePairs(allMoves: MoveNotation[]): MoveNotation[][] {
    if (allMoves.length === 0) return [];

    const result: MoveNotation[][] = [];
    for (let i = 0; i < allMoves.length; i += 2) {
        result.push(allMoves.slice(i, i + 2));
    }

    return result;
}

const MOVE_HISTORY_BASE_CLASSES = 'text-zinc-200 tabular-nums whitespace-nowrap';
const ACTIVE_MOVE_CLASSES = 'font-bold text-zinc-100';
const MOVE_CELL_CLASSES = 'hover:bg-white/10 cursor-pointer px-2 py-0.5 rounded-md';

function MoveHistoryTable() {
    const { moveHistory, gameStatus } = useChessGame();
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);

    const movePairs = createMovePairs(moveHistory);
    const isGameOver = gameStatus.status !== 'in-progress';
    const isDraw = isDrawStatus(gameStatus.status);
    const winnerLabel = isDraw ? 'Draw' : gameStatus.winner === 'white' ? 'White wins' : 'Black wins';
    const resultScore = gameStatus.winner === 'white' ? '1-0' : gameStatus.winner === 'black' ? '0-1' : '1/2-1/2';
    const statusLabel = (() => {
        if (isDraw) return getDisplayTextForDrawStatus(gameStatus.status);
        const label = gameStatus.status.replace(/-/g, ' ');
        return label.charAt(0).toUpperCase() + label.slice(1);
    })();

    // Auto-scroll to bottom when a new move is added
    useEffect(() => {
        const element = scrollContainerRef.current;
        if (!element) return;
        element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
    }, [moveHistory.length]);

    return (
        <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            <table className="table-fixed w-full xl:text-base 2xl:text-lg text-sm">
                <colgroup>
                    <col className="xl:w-[4ch] w-[2ch]" />
                    <col className="xl:w-[12ch] w-[7ch]" />
                    <col className="xl:w-[12ch] w-[7ch]" />
                </colgroup>
                <tbody>
                    {movePairs.map(([whiteMove, blackMove], index) => {
                        const isLastRow = index === movePairs.length - 1;
                        const lastMoveIsBlack = moveHistory.length > 0 && moveHistory.length % 2 === 0;
                        const whiteClasses = `${MOVE_HISTORY_BASE_CLASSES} ${
                            isLastRow && !lastMoveIsBlack ? ACTIVE_MOVE_CLASSES : ''
                        }`;
                        const blackClasses = `${MOVE_HISTORY_BASE_CLASSES} ${
                            isLastRow && lastMoveIsBlack ? ACTIVE_MOVE_CLASSES : ''
                        }`;

                        return (
                            <tr key={`move-history-${index}`}>
                                <td>
                                    <span className={`${MOVE_HISTORY_BASE_CLASSES} text-zinc-400 text-center`}>
                                        {index + 1}.
                                    </span>
                                </td>
                                <td className={MOVE_CELL_CLASSES}>
                                    <span className={whiteClasses} aria-label={whiteMove.algebraicNotation}>
                                        {whiteMove.figurineAlgebraicNotation}
                                    </span>
                                </td>
                                <td {...(blackMove ? { className: MOVE_CELL_CLASSES } : {})}>
                                    {blackMove ? (
                                        <span className={blackClasses} aria-label={blackMove.algebraicNotation}>
                                            {blackMove.figurineAlgebraicNotation}
                                        </span>
                                    ) : (
                                        <span className={`${MOVE_HISTORY_BASE_CLASSES} invisible`}>—</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {isGameOver ? (
                <div
                    aria-live="polite"
                    role="status"
                    className="my-4 rounded-md border border-white/10 bg-zinc-900 p-3 w-[95%] text-sm text-zinc-200"
                >
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">{statusLabel}</p>
                    <p className="mt-1 text-base font-semibold text-zinc-100">{winnerLabel}</p>
                    <p className="text-sm text-zinc-200">{resultScore}</p>
                </div>
            ) : null}
        </div>
    );
}

export default MoveHistoryTable;
