import GameInfoPanel from './components/GameInfoPanel';
import GameRoomController from './components/GameRoomController';
import MainSection from './components/MainSection';
import PlayersInfoSection from './components/PlayersInfoSection';
import SoundEffects from './components/SoundEffects';
import ChessGameProvider from './providers/ChessGameProvider';
import GameRoomProvider from './providers/GameRoomProvider';
import ImagesProvider from './providers/ImagesProvider';
import SoundProvider from './providers/SoundProvider';
import { uniquePieceImgSrcs } from './utils/pieces';

function App() {
    return (
        <SoundProvider>
            <ImagesProvider imgSrcs={uniquePieceImgSrcs}>
                <GameRoomProvider>
                    <ChessGameProvider>
                        <SoundEffects />
                        <GameRoomController />

                        <main className="min-h-dvh bg-zinc-800">
                            <div className="grid grid-cols-12 2xl:gap-16 xl:gap-12 lg:gap-8 gap-4 py-8 2xl:px-24 xl:px-12 px-4">
                                <section className="md:col-span-3 lg:block hidden">
                                    <PlayersInfoSection variant="col" />
                                </section>
                                <section className="lg:col-span-6 col-span-9">
                                    <MainSection />
                                </section>
                                <section className="col-span-3 2xl:max-h-[800px] max-h-[700px]">
                                    <GameInfoPanel />
                                </section>
                            </div>

                            <section className="lg:hidden">
                                <PlayersInfoSection variant="row" />
                            </section>
                        </main>
                    </ChessGameProvider>
                </GameRoomProvider>
            </ImagesProvider>
        </SoundProvider>
    );
}

export default App;
