import ViewController from './components/views/ViewController';
import AuthProvider from './providers/AuthProvider';
import ClockTickProvider from './providers/ClockTickProvider';
import ImagesProvider from './providers/ImagesProvider';
import SocketProvider from './providers/SocketProvider';
import SoundProvider from './providers/SoundProvider';
import StoredSettingsProvider from './providers/StoredSettingsProvider';
import { uniquePieceImgSrcs } from './utils/pieces';

function App() {
    return (
        <AuthProvider>
            <SocketProvider>
                <StoredSettingsProvider>
                    <ImagesProvider imgSrcs={uniquePieceImgSrcs}>
                        <SoundProvider>
                            <ClockTickProvider>
                                <ViewController />
                            </ClockTickProvider>
                        </SoundProvider>
                    </ImagesProvider>
                </StoredSettingsProvider>
            </SocketProvider>
        </AuthProvider>
    );
}

export default App;
