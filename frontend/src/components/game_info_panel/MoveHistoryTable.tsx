import { useEffect, useRef, useState } from 'react';

import { isDrawStatus, type MoveNotation } from '@grouchess/chess';
import invariant from 'tiny-invariant';

import HandPeaceIcon from '../../assets/icons/hand-peace.svg?react';
import RotateLeftIcon from '../../assets/icons/rotate-left.svg?react';
import { useChessGame, useGameRoom } from '../../providers/ChessGameRoomProvider';
import { useGameRoomSocket } from '../../providers/GameRoomSocketProvider';
import { getDisplayTextForDrawStatus } from '../../utils/draws';
import IconButton from '../common/IconButton';
import Spinner from '../common/Spinner';

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
    const { chessGame, loadFEN } = useChessGame();
    const { gameRoom } = useGameRoom();
    invariant(chessGame && gameRoom, 'chessGame and gameRoom are required to display move history');
    const { moveHistory, gameState } = chessGame;
    const { sendOfferRematch } = useGameRoomSocket();
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const [isOfferingRematch, setIsOfferingRematch] = useState(false);

    const moveNotations = moveHistory.map(({ notation }) => notation);
    const movePairs = createMovePairs(moveNotations);
    const isGameOver = gameState.status !== 'in-progress';
    const isDraw = isDrawStatus(gameState.status);
    const winnerLabel = isDraw ? 'Draw' : gameState.winner === 'white' ? 'White wins' : 'Black wins';
    const resultScore = gameState.winner === 'white' ? '1-0' : gameState.winner === 'black' ? '0-1' : '1/2-1/2';
    const statusLabel = (() => {
        if (isDraw) return getDisplayTextForDrawStatus(gameState.status);
        const label = gameState.status.replace(/-/g, ' ');
        return label.charAt(0).toUpperCase() + label.slice(1);
    })();

    // Auto-scroll to bottom when a new move is added
    useEffect(() => {
        const element = scrollContainerRef.current;
        if (!element) return;
        element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
    }, [moveHistory.length]);

    const handleRematchOfferClick = () => {
        if (gameRoom.type === 'self') {
            loadFEN();
            return;
        }
        setIsOfferingRematch(true);
        sendOfferRematch();
    };

    return (
        <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
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
                <div
                    aria-live="polite"
                    role="status"
                    className="my-4 flex md:flex-row flex-col md:gap-2 gap-5 justify-between rounded-md border border-white/10 bg-zinc-900 p-3 w-[95%] text-sm text-zinc-200"
                >
                    <div>
                        <p className="text-xs uppercase tracking-widest text-zinc-400">{statusLabel}</p>
                        <p className="mt-1 text-lg font-semibold font-display text-zinc-100">{winnerLabel}</p>
                        <p className={`text-sm px-0.5 text-zinc-300 ${isDraw && 'diagonal-fractions'}`}>
                            {resultScore}
                        </p>
                    </div>
                    <div className="flex md:flex-col flex-row md:gap-0 md:place-content-between justify-center md:py-1 py-0 gap-6">
                        {isOfferingRematch ? (
                            <Spinner size="md" />
                        ) : (
                            <IconButton
                                icon={<RotateLeftIcon className="size-5" aria-hidden="true" />}
                                aria-label="Offer Rematch"
                                tooltipText="Rematch"
                                onClick={handleRematchOfferClick}
                            />
                        )}
                        <IconButton
                            icon={<HandPeaceIcon className="size-5" aria-hidden="true" />}
                            aria-label="Exit Game"
                            tooltipText="Exit"
                            onClick={onExitClick}
                        />
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export default MoveHistoryTable;
