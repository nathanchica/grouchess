import { useCallback } from 'react';

import type { ChessGameState } from '@grouchess/chess';

import GameResultCard from './GameResultCard';

import { useChessGame } from '../../providers/ChessGameRoomProvider';
import { useSocket } from '../../providers/SocketProvider';

type Props = {
    isSelfPlay: boolean;
    gameState: ChessGameState;
    onExitClick: () => void;
};

function GameResultCardController({ isSelfPlay, gameState, onExitClick }: Props) {
    const { socket } = useSocket();
    const { loadFEN } = useChessGame();

    const sendOfferRematch = useCallback(() => {
        socket.emit('offer_rematch');
    }, [socket]);

    const onRematchClick = useCallback(() => {
        if (isSelfPlay) {
            loadFEN();
            return;
        }
        sendOfferRematch();
    }, [isSelfPlay, loadFEN, sendOfferRematch]);

    return <GameResultCard onExitClick={onExitClick} onRematchClick={onRematchClick} gameState={gameState} />;
}

export default GameResultCardController;
