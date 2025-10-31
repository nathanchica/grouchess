import FlagIcon from '../../assets/icons/flag.svg?react';
import { useChessGame } from '../../providers/ChessGameRoomProvider';
import { useSocket } from '../../providers/SocketProvider';
import IconButton from '../common/IconButton';
import TooltipContainer from '../common/TooltipContainer';

function GameActions() {
    const { socket } = useSocket();
    const { chessGame } = useChessGame();

    const buttonsAreDisabled = chessGame.gameState.status !== 'in-progress';

    const onOfferDrawClick = () => {
        if (buttonsAreDisabled) return;
        socket.emit('offer_draw');
    };

    const onResignClick = () => {
        if (buttonsAreDisabled) return;
        socket.emit('resign');
    };

    return (
        <section className="flex flex-row lg:gap-12 gap-8 justify-center">
            <TooltipContainer tooltipText="Offer a draw">
                <button
                    type="button"
                    aria-label="Offer a draw"
                    className="text-4xl text-zinc-400 hover:text-zinc-100 disabled:pointer-events-none cursor-pointer font-bold diagonal-fractions disabled:opacity-50 transition"
                    onClick={onOfferDrawClick}
                    disabled={buttonsAreDisabled}
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
