import { Routes, Route } from 'react-router';

import ChessGameView from './components/views/ChessGameView';
import MainMenuView from './components/views/MainMenuView';
import ImagesProvider from './providers/ImagesProvider';
import SoundProvider from './providers/SoundProvider';
import { uniquePieceImgSrcs } from './utils/pieces';

function App() {
    return (
        <ImagesProvider imgSrcs={uniquePieceImgSrcs}>
            <SoundProvider>
                <Routes>
                    <Route path="/" element={<MainMenuView />} />
                    <Route path="/freeplay" element={<ChessGameView />} />
                </Routes>
            </SoundProvider>
        </ImagesProvider>
    );
}

export default App;
