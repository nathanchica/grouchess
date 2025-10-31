import { useState } from 'react';

import type { PieceColor } from '@grouchess/chess';

import FlagIcon from '../../assets/icons/flag.svg?react';
import { useChessGame } from '../../providers/ChessGameRoomProvider';
import { useSocket } from '../../providers/SocketProvider';
import IconButton from '../common/IconButton';
import TooltipContainer from '../common/TooltipContainer';

type Props = {
    playerColor: PieceColor;
};

function GameActions({ playerColor }: Props) {
    const { socket } = useSocket();
    const { chessGame } = useChessGame();

    const [isDrawOffered, setIsDrawOffered] = useState(false);

    const { gameState, boardState } = chessGame;

    const buttonsAreDisabled = gameState.status !== 'in-progress';
    const drawOfferButtonIsDisabled = buttonsAreDisabled || isDrawOffered || boardState.playerTurn !== playerColor;

    const onOfferDrawClick = () => {
        socket.emit('offer_draw');
        setIsDrawOffered(true);
    };

    const onResignClick = () => {
        socket.emit('resign');
    };

    return (
        <section className="flex flex-row justify-evenly">
            <TooltipContainer tooltipText="Offer a draw">
                <button
                    type="button"
                    aria-label="Offer a draw"
                    className="text-4xl text-zinc-400 hover:text-zinc-100 disabled:pointer-events-none cursor-pointer font-bold diagonal-fractions disabled:opacity-50 transition"
                    onClick={onOfferDrawClick}
                    disabled={drawOfferButtonIsDisabled}
                >
                    1/2
                </button>
            </TooltipContainer>

            <IconButton
                icon={<FlagIcon className="size-8" aria-hidden="true" />}
                onClick={onResignClick}
                ariaProps={{
                    'aria-label': 'Resign game',
                }}
                tooltipText="Resign game"
                disabled={buttonsAreDisabled}
            />
        </section>
    );
}

export default GameActions;
