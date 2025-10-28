import ChessGameView from './ChessGameView';
import MainMenuView from './MainMenuView';

import { useGameRoom, useChessGame } from '../../providers/ChessGameRoomProvider';

function ViewController() {
    const { gameRoom } = useGameRoom();
    const { chessGame } = useChessGame();

    return <>{gameRoom && chessGame ? <ChessGameView timeControl={gameRoom.timeControl} /> : <MainMenuView />}</>;
}

export default ViewController;
