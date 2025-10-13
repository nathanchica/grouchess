import ChessBoard from './components/ChessBoard';
import ImagesProvider from './providers/ImagesProvider';

import { uniquePieceImgSrcs } from './utils/pieces';

function App() {
    return (
        <ImagesProvider imgSrcs={uniquePieceImgSrcs}>
            <div className="min-h-dvh bg-zinc-800 text-center">
                <div className="max-w-4xl p-16 m-auto">
                    <ChessBoard />
                </div>
            </div>
        </ImagesProvider>
    );
}

export default App;
