import { useState } from 'react';

import { isDrawStatus, type ChessGameState } from '@grouchess/chess';

import HandPeaceIcon from '../../assets/icons/hand-peace.svg?react';
import RotateLeftIcon from '../../assets/icons/rotate-left.svg?react';
import { getDisplayTextForDrawStatus } from '../../utils/draws';
import IconButton from '../common/IconButton';
import Spinner from '../common/Spinner';

type Props = {
    gameState: ChessGameState;
    onExitClick: () => void;
    onRematchClick: () => void;
};

function GameResultCard({ gameState, onExitClick, onRematchClick }: Props) {
    const [isOfferingRematch, setIsOfferingRematch] = useState(false);

    const isDraw = isDrawStatus(gameState.status);
    const winnerLabel = isDraw ? 'Draw' : gameState.winner === 'white' ? 'White wins' : 'Black wins';
    const resultScore = gameState.winner === 'white' ? '1-0' : gameState.winner === 'black' ? '0-1' : '1/2-1/2';
    const statusLabel = (() => {
        if (isDraw) return getDisplayTextForDrawStatus(gameState.status);
        const label = gameState.status.replace(/-/g, ' ');
        return label.charAt(0).toUpperCase() + label.slice(1);
    })();

    const handleRematchOfferClick = () => {
        setIsOfferingRematch(true);
        onRematchClick();
    };

    return (
        <div
            aria-live="polite"
            role="status"
            className="my-4 flex md:flex-row flex-col md:gap-2 gap-5 justify-between rounded-md border border-white/10 bg-zinc-900 p-3 w-[95%] text-sm text-zinc-200"
        >
            <div>
                <p className="text-xs uppercase tracking-widest text-zinc-400">{statusLabel}</p>
                <p className="mt-1 text-lg font-semibold font-display text-zinc-100">{winnerLabel}</p>
                <p className={`text-sm px-0.5 text-zinc-300 ${isDraw && 'diagonal-fractions'}`}>{resultScore}</p>
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
    );
}

export default GameResultCard;
