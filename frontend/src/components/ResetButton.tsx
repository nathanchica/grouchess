import RotateLeftIcon from '../assets/icons/rotate-left.svg?react';
import { useChessGame } from '../providers/ChessGameProvider';

function ResetButton() {
    const { resetGame } = useChessGame();
    return (
        <button
            type="button"
            aria-label="Reset game"
            onClick={resetGame}
            className="text-zinc-400 hover:text-zinc-100 cursor-pointer"
        >
            <RotateLeftIcon className="w-5 h-5" aria-hidden="true" />
        </button>
    );
}

export default ResetButton;
