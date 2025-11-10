import { useEffect, useRef } from 'react';

import { type MoveNotation } from '@grouchess/models';

import GameResultCardController from './GameResultCardController';
import MoveHistoryTableRow from './MoveHistoryTableRow';

import { useChessGame, useGameRoom } from '../../providers/ChessGameRoomProvider';

export function createMovePairs(allMoves: MoveNotation[]): MoveNotation[][] {
    if (allMoves.length === 0) return [];

    const result: MoveNotation[][] = [];
    for (let i = 0; i < allMoves.length; i += 2) {
        result.push(allMoves.slice(i, i + 2));
    }

    return result;
}

export type MoveHistoryTableProps = {
    onExitClick: () => void;
};

function MoveHistoryTable({ onExitClick }: MoveHistoryTableProps) {
    const { chessGame } = useChessGame();
    const { gameRoom } = useGameRoom();
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
        <div className="flex-1 min-h-0 bg-zinc-900/60 p-3 rounded-md overflow-y-auto overflow-x-hidden">
            <table className="table-fixed w-full 2xl:text-base text-sm">
                <colgroup>
                    <col className="xl:w-[4ch] lg:w-[3ch] w-[2ch]" />
                    <col className="xl:w-[12ch] lg:w-[9ch] w-[7ch]" />
                    <col className="xl:w-[12ch] lg:w-[9ch] w-[7ch]" />
                </colgroup>
                <tbody>
                    {movePairs.map((movePair, index) => {
                        const isLastRow = index === movePairs.length - 1;
                        const lastMoveIsBlack = moveHistory.length > 0 && moveHistory.length % 2 === 0;

                        return (
                            <MoveHistoryTableRow
                                key={`move-history-row-${index}`}
                                movePair={movePair}
                                moveNumber={index + 1}
                                isLastRow={isLastRow}
                                lastMoveIsBlack={lastMoveIsBlack}
                            />
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
