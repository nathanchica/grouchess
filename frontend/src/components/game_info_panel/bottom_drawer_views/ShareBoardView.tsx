import { createFEN } from '@grouchess/chess';

import { useChessGame } from '../../../providers/ChessGameRoomProvider';
import CopyableTextField from '../../common/CopyableTextField';

function ShareBoardView() {
    const { chessGame } = useChessGame();
    const { boardState } = chessGame;

    const fenString = createFEN(boardState);

    return (
        <div className="w-full flex flex-col gap-6 pb-8">
            <h2 className="text-lg text-slate-50 font-semibold">Share Board</h2>

            <CopyableTextField text={fenString} label="FEN" id="fen-string" copyButtonAriaLabel="Copy FEN" />
        </div>
    );
}

export default ShareBoardView;
