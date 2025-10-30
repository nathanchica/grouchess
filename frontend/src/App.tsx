import ViewController from './components/views/ViewController';
import AuthProvider from './providers/AuthProvider';
import ClockTickProvider from './providers/ClockTickProvider';
import ImagesProvider from './providers/ImagesProvider';
import SocketProvider from './providers/SocketProvider';
import SoundProvider from './providers/SoundProvider';
import { uniquePieceImgSrcs } from './utils/pieces';

function App() {
    return (
        <AuthProvider>
            <SocketProvider>
                <ImagesProvider imgSrcs={uniquePieceImgSrcs}>
                    <SoundProvider>
                        <ClockTickProvider>
                            <ViewController />
                        </ClockTickProvider>
                    </SoundProvider>
                </ImagesProvider>
            </SocketProvider>
        </AuthProvider>
    );
}

export default App;
