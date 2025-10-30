import type { ChessClockState } from '@grouchess/chess';

import MainSection from '../../components/MainSection';
import PlayersInfoSection from '../../components/PlayersInfoSection';
import ChessClockSocketProvider from '../../providers/ChessClockSocketProvider';
import ChessGameRoomProvider, { type ChessGameRoomState } from '../../providers/ChessGameRoomProvider';
import PlayerChatSocketProvider from '../../providers/PlayerChatSocketProvider';
import ChessClocksController from '../controllers/ChessClocksController';
import ChessMovesController from '../controllers/ChessMovesController';
import SoundEffects from '../controllers/SoundEffects';
import GameInfoPanel from '../game_info_panel/GameInfoPanel';

type Props = {
    initialChessGameRoomData: ChessGameRoomState;
    initialClockState: ChessClockState | null;
};

function ChessGameView({ initialChessGameRoomData: initialData, initialClockState }: Props) {
    const { gameRoom } = initialData;
    const { messages: initialMessages, type, timeControl } = gameRoom;

    // Determine if clocks should be controlled locally or by the server
    const shouldUseChessClocksController = type === 'self' && Boolean(timeControl);

    return (
        <ChessGameRoomProvider initialData={initialData}>
            <PlayerChatSocketProvider initialMessages={initialMessages}>
                <ChessClockSocketProvider initialState={initialClockState}>
                    <SoundEffects />
                    <ChessMovesController />
                    {shouldUseChessClocksController && <ChessClocksController />}

                    <main className="min-h-dvh font-serif bg-zinc-800">
                        <div className="grid grid-cols-12 2xl:gap-12 xl:gap-10 lg:gap-8 gap-4 py-8 2xl:px-24 xl:px-12 px-4">
                            <section className="md:col-span-3 lg:block hidden contain-size">
                                <PlayersInfoSection variant="col" />
                            </section>
                            <section className="lg:col-span-6 sm:col-span-9 col-span-12">
                                <MainSection />
                            </section>
                            <section className="col-span-3 sm:block hidden contain-size">
                                <GameInfoPanel />
                            </section>
                        </div>

                        <section className="lg:hidden">
                            <PlayersInfoSection variant="row" />
                        </section>

                        <section className="sm:hidden mt-8 px-4 pb-8">
                            <GameInfoPanel />
                        </section>
                    </main>
                </ChessClockSocketProvider>
            </PlayerChatSocketProvider>
        </ChessGameRoomProvider>
    );
}

export default ChessGameView;
