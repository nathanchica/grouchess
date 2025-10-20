import RotateLeftIcon from '../assets/icons/rotate-left.svg?react';
import { useChessGame } from '../providers/ChessGameProvider';
import { useGameRoom } from '../providers/GameRoomProvider';

function ResetButton() {
    const { resetGame } = useChessGame();
    const { incrementGameCount } = useGameRoom();

    const onClick = () => {
        resetGame();
        incrementGameCount();
    };

    return (
        <button
            type="button"
            aria-label="Reset game"
            onClick={onClick}
            className="text-zinc-400 hover:text-zinc-100 cursor-pointer"
        >
            <RotateLeftIcon className="w-5 h-5" aria-hidden="true" />
        </button>
    );
}

export default ResetButton;
