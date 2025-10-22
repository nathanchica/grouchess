import ChessGameView from './ChessGameView';
import MainMenuView from './MainMenuView';

import { useGameRoom } from '../../providers/GameRoomProvider';

function ViewController() {
    const { room } = useGameRoom();

    return <>{room ? <ChessGameView /> : <MainMenuView />}</>;
}

export default ViewController;
