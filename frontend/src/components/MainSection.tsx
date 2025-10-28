import invariant from 'tiny-invariant';

import ChessBoard from './chess_board/ChessBoard';

import { useChessGame } from '../providers/ChessGameRoomProvider';

function MainSection() {
    const { chessGame } = useChessGame();
    invariant(chessGame, 'chessGame is required for MainSection component');
    const { timelineVersion } = chessGame;

    return <ChessBoard key={`chessboard-${timelineVersion}`} />;
}

export default MainSection;
