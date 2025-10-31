import invariant from 'tiny-invariant';

import ChessBoard from './chess_board/ChessBoard';

import { useChessGame } from '../providers/ChessGameRoomProvider';

function MainSection() {
    const { chessGame } = useChessGame();
    invariant(chessGame, 'chessGame is required for MainSection component');
    const { timelineVersion, gameState } = chessGame;

    /**
     * Use timelineVersion and game status as key to force remounting ChessBoard when timelineVersion changes or game
     * status changes in order to reset interaction states (e.g., dragging piece, selected square) appropriately.
     */
    return <ChessBoard key={`chessboard-${timelineVersion}-${gameState.status}`} />;
}

export default MainSection;
