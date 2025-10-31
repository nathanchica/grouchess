import { useEffect, useRef } from 'react';

import { type MoveNotation } from '@grouchess/chess';
import invariant from 'tiny-invariant';

import GameResultCardController from './GameResultCardController';

import { useChessGame, useGameRoom } from '../../providers/ChessGameRoomProvider';

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

type Props = {
    onExitClick: () => void;
};

function MoveHistoryTable({ onExitClick }: Props) {
    const { chessGame } = useChessGame();
    const { gameRoom } = useGameRoom();
    invariant(chessGame && gameRoom, 'chessGame and gameRoom are required to display move history');
    const { moveHistory, gameState } = chessGame;
    const containerEndRef = useRef<HTMLDivElement | null>(null);

    const moveNotations = moveHistory.map(({ notation }) => notation);
    const movePairs = createMovePairs(moveNotations);
    const isGameOver = gameState.status !== 'in-progress';

    // Auto-scroll to bottom when a new move is added or the game ends
    useEffect(() => {
        containerEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [moveHistory.length, isGameOver]);

    return (
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            <table className="table-fixed w-full 2xl:text-base text-sm">
                <colgroup>
                    <col className="xl:w-[4ch] lg:w-[3ch] w-[2ch]" />
                    <col className="xl:w-[12ch] lg:w-[9ch] w-[7ch]" />
                    <col className="xl:w-[12ch] lg:w-[9ch] w-[7ch]" />
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
                                    <span className={whiteClasses} aria-label={whiteMove.san}>
                                        {whiteMove.figurine}
                                    </span>
                                </td>
                                <td {...(blackMove ? { className: MOVE_CELL_CLASSES } : {})}>
                                    {blackMove ? (
                                        <span className={blackClasses} aria-label={blackMove.san}>
                                            {blackMove.figurine}
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
                <GameResultCardController
                    isSelfPlay={gameRoom.type === 'self'}
                    gameState={gameState}
                    onExitClick={onExitClick}
                />
            ) : null}

            <div ref={containerEndRef} />
        </div>
    );
}

export default MoveHistoryTable;
