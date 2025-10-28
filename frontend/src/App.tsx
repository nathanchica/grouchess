import ViewController from './components/views/ViewController';
import ChessGameRoomProvider from './providers/ChessGameRoomProvider';
import GameRoomSocketProvider from './providers/GameRoomSocketProvider';
import ImagesProvider from './providers/ImagesProvider';
import SoundProvider from './providers/SoundProvider';
import { uniquePieceImgSrcs } from './utils/pieces';

function App() {
    return (
        <ImagesProvider imgSrcs={uniquePieceImgSrcs}>
            <SoundProvider>
                <ChessGameRoomProvider>
                    <GameRoomSocketProvider>
                        <ViewController />
                    </GameRoomSocketProvider>
                </ChessGameRoomProvider>
            </SoundProvider>
        </ImagesProvider>
    );
}

export default App;
