import ChessBoard from './ChessBoard';

import { useChessGame } from '../providers/ChessGameProvider';

function MainSection() {
    const { timelineVersion } = useChessGame();

    return <ChessBoard key={`chessboard-${timelineVersion}`} />;
}

export default MainSection;
