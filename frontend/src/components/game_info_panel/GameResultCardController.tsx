import { useCallback } from 'react';

import type { ChessGameState } from '@grouchess/models';

import GameResultCard from './GameResultCard';

import { useChessGame } from '../../providers/ChessGameRoomProvider';
import { usePlayerChatSocket } from '../../providers/PlayerChatSocketProvider';

type Props = {
    isSelfPlay: boolean;
    gameState: ChessGameState;
    onExitClick: () => void;
};

function GameResultCardController({ isSelfPlay, gameState, onExitClick }: Props) {
    const { isAwaitingRematchResponse, sendRematchOffer } = usePlayerChatSocket();
    const { loadFEN } = useChessGame();

    const onRematchClick = useCallback(() => {
        if (isSelfPlay) {
            loadFEN();
            return;
        }
        sendRematchOffer();
    }, [isSelfPlay, loadFEN, sendRematchOffer]);

    return (
        <GameResultCard
            isAwaitingRematchResponse={isAwaitingRematchResponse}
            onExitClick={onExitClick}
            onRematchClick={onRematchClick}
            gameState={gameState}
        />
    );
}

export default GameResultCardController;
