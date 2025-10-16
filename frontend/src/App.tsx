import ChessGameProvider from './providers/ChessGameProvider';
import MainSection from './components/MainSection';
import InfoCard from './components/InfoCard';
import PlayerCard from './components/PlayerCard';
import ImagesProvider from './providers/ImagesProvider';
import ResetButton from './components/ResetButton';

import { uniquePieceImgSrcs } from './utils/pieces';

function App() {
    return (
        <ImagesProvider imgSrcs={uniquePieceImgSrcs}>
            <ChessGameProvider>
                <main className="min-h-dvh bg-zinc-800">
                    <div className="grid grid-cols-12 gap-16 py-8 px-24">
                        <section className="col-span-3">
                            <div className="flex flex-col gap-8 h-full">
                                <PlayerCard color="black" displayName="Black" />
                                <div className="grow" />
                                <PlayerCard color="white" displayName="White" />
                            </div>
                        </section>
                        <section className="col-span-6">
                            <MainSection />
                        </section>
                        <InfoCard className="col-span-3 p-16">
                            <ResetButton />
                        </InfoCard>
                    </div>
                </main>
            </ChessGameProvider>
        </ImagesProvider>
    );
}

export default App;
