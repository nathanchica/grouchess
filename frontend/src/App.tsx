import GameInfoPanel from './components/GameInfoPanel';
import MainSection from './components/MainSection';
import PlayerCard from './components/PlayerCard';
import SoundEffects from './components/SoundEffects';
import ChessGameProvider from './providers/ChessGameProvider';
import ImagesProvider from './providers/ImagesProvider';
import SoundProvider from './providers/SoundProvider';
import { uniquePieceImgSrcs } from './utils/pieces';

function App() {
    return (
        <SoundProvider>
            <ImagesProvider imgSrcs={uniquePieceImgSrcs}>
                <ChessGameProvider>
                    <SoundEffects />

                    <main className="min-h-dvh bg-zinc-800">
                        <div className="grid grid-cols-12 2xl:gap-16 xl:gap-12 lg:gap-8 gap-4 py-8 2xl:px-24 xl:px-12 px-4">
                            <section className="md:col-span-3 lg:block hidden">
                                <div className="flex flex-col gap-8 h-full">
                                    <PlayerCard color="black" displayName="Black" />
                                    <div className="grow" />
                                    <PlayerCard color="white" displayName="White" />
                                </div>
                            </section>
                            <section className="lg:col-span-6 col-span-9">
                                <MainSection />
                            </section>
                            <section className="col-span-3 2xl:max-h-[800px] max-h-[700px]">
                                <GameInfoPanel />
                            </section>
                        </div>

                        <section className="lg:hidden flex flex-row gap-2 px-4">
                            <PlayerCard color="white" displayName="White" />
                            <div className="grow" />
                            <PlayerCard color="black" displayName="Black" />
                        </section>
                    </main>
                </ChessGameProvider>
            </ImagesProvider>
        </SoundProvider>
    );
}

export default App;
