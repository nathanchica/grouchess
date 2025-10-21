import ViewController from './components/views/ViewController';
import GameRoomProvider from './providers/GameRoomProvider';
import ImagesProvider from './providers/ImagesProvider';
import SoundProvider from './providers/SoundProvider';
import { uniquePieceImgSrcs } from './utils/pieces';

function App() {
    return (
        <ImagesProvider imgSrcs={uniquePieceImgSrcs}>
            <SoundProvider>
                <GameRoomProvider>
                    <ViewController />
                </GameRoomProvider>
            </SoundProvider>
        </ImagesProvider>
    );
}

export default App;
