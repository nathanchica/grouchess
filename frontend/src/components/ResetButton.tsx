import { useChessGame } from '../providers/ChessGameProvider';

function ResetButton() {
    const { resetGame } = useChessGame();
    return (
        <button className="cursor-pointer border p-2 border-white text-white" onClick={resetGame}>
            RESET
        </button>
    );
}

export default ResetButton;
