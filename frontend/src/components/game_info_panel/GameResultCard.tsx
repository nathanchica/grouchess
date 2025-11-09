import { isDrawStatus } from '@grouchess/chess';
import type { ChessGameState } from '@grouchess/models';
import invariant from 'tiny-invariant';

import HandPeaceIcon from '../../assets/icons/hand-peace.svg?react';
import RotateLeftIcon from '../../assets/icons/rotate-left.svg?react';
import { getDisplayTextForDrawStatus } from '../../utils/draws';
import { capitalizeFirstLetter } from '../../utils/formatting';
import IconButton from '../common/IconButton';
import Spinner from '../common/Spinner';

type Props = {
    gameState: ChessGameState;
    isAwaitingRematchResponse: boolean;
    onExitClick: () => void;
    onRematchClick: () => void;
};

function GameResultCard({ gameState, isAwaitingRematchResponse, onExitClick, onRematchClick }: Props) {
    const { status, winner } = gameState;
    invariant(status !== 'in-progress', 'GameResultCard should only be used for completed games');

    const isDraw = isDrawStatus(status);
    const resultScore = winner === 'white' ? '1-0' : winner === 'black' ? '0-1' : '1/2-1/2';

    let winnerLabel;
    if (isDraw) winnerLabel = 'Draw';
    else if (winner === 'white') winnerLabel = 'White wins';
    else if (winner === 'black') winnerLabel = 'Black wins';
    else invariant(false, 'Winner must be defined for non-draw game results');

    let statusLabel;
    if (isDraw) statusLabel = getDisplayTextForDrawStatus(status);
    else if (status === 'resigned') {
        // The invariant above ensures winner is either 'white' or 'black' here
        const losingPlayerColor = winner === 'white' ? 'Black' : 'White';
        statusLabel = `${losingPlayerColor} resigned`;
    } else {
        statusLabel = capitalizeFirstLetter(status.replace(/-/g, ' '));
    }

    return (
        <div
            aria-live="polite"
            role="status"
            className="my-4 flex md:flex-row flex-col md:gap-2 gap-5 justify-between rounded-md bg-zinc-900 p-3 w-[95%] text-sm text-zinc-200"
        >
            <div>
                <p className="text-xs uppercase tracking-widest text-zinc-400">{statusLabel}</p>
                <p className="mt-1 text-lg font-semibold font-display text-zinc-100">{winnerLabel}</p>
                <p className={`text-sm px-0.5 text-zinc-300 ${isDraw && 'diagonal-fractions'}`}>{resultScore}</p>
            </div>
            <div className="flex md:flex-col flex-row md:gap-0 md:place-content-between justify-center md:py-1 py-0 gap-6">
                {isAwaitingRematchResponse ? (
                    <div aria-label="Awaiting rematch response">
                        <Spinner size="md" />
                    </div>
                ) : (
                    <IconButton
                        icon={<RotateLeftIcon className="size-5" aria-hidden="true" />}
                        tooltipText="Rematch"
                        ariaProps={{
                            'aria-label': 'Offer rematch',
                        }}
                        onClick={onRematchClick}
                    />
                )}

                <IconButton
                    icon={<HandPeaceIcon className="size-5" aria-hidden="true" />}
                    ariaProps={{
                        'aria-label': 'Exit Game',
                    }}
                    tooltipText="Exit"
                    onClick={onExitClick}
                />
            </div>
        </div>
    );
}

export default GameResultCard;
