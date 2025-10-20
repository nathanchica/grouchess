import { Routes, Route } from 'react-router';

import ChessGameView from './components/views/ChessGameView';
import MainMenuView from './components/views/MainMenuView';

function App() {
    return (
        <Routes>
            <Route path="/" element={<MainMenuView />} />
            <Route path="/freeplay" element={<ChessGameView />} />
        </Routes>
    );
}

export default App;
