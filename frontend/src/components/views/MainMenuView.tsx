import { useState } from 'react';

import { useCreateGameRoom } from '../../hooks/useCreateGameRoom';
import type { Player, GameRoom, RoomType, TimeControl } from '../../providers/GameRoomProvider';
import { useGameRoom } from '../../providers/GameRoomProvider';
import { useImages } from '../../providers/ImagesProvider';
import { getPiece, type PieceColor } from '../../utils/pieces';
import Spinner from '../common/Spinner';
import DisplayNameForm from '../mainmenu/DisplayNameForm';
import SideSelectForm from '../mainmenu/SideSelectForm';
import TimeControlForm from '../mainmenu/TimeControlForm';

const ROOM_OPTION_CLASSES =
    'flex w-full cursor-pointer flex-col items-start gap-1 rounded-2xl border border-zinc-800 px-6 py-5 text-left transition hover:border-emerald-400/50 hover:bg-emerald-500/10 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-emerald-400';

type RoomTypeOption = {
    type: RoomType;
    label: string;
    description: string;
};
const ROOM_TYPES: RoomTypeOption[] = [
    {
        type: 'player-vs-player',
        label: 'Play against a Friend',
        description: 'Create a private room and share the link',
    },
    {
        type: 'player-vs-cpu',
        label: 'Play against a Computer',
        description: 'Face a computer opponent',
    },
    {
        type: 'self',
        label: 'Self-Play',
        description: 'Play both sides of the board',
    },
];
const DEFAULT_ROOM_TYPE = ROOM_TYPES[0].type;

const FORMS = ['time-control', 'side-select', 'display-name'];
const ROOM_TYPE_TO_FORMS_MAP: Record<string, string[]> = {
    'player-vs-player': FORMS,
    'player-vs-cpu': ['time-control', 'side-select'],
    self: ['time-control'],
};

function MainMenuView() {
    const { imgSrcMap } = useImages();
    const { setRoom } = useGameRoom();
    const { createGameRoom, loading, error } = useCreateGameRoom();

    const [selectedRoomType, setSelectedRoomType] = useState<RoomType>(DEFAULT_ROOM_TYPE);
    const [selectedTimeControlOption, setSelectedTimeControlOption] = useState<TimeControl | null>(null);
    const [selectedDisplayName, setSelectedDisplayName] = useState<string | null>(null);
    const [selectedSide, setSelectedSide] = useState<PieceColor | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const onDisplayNameChange = (name: string) => {
        setSelectedDisplayName(name);
    };

    const onSideSelect = (side: PieceColor | null) => {
        setSelectedSide(side);
    };

    const onTimeControlSelect = (timeControlOption: TimeControl | null) => {
        setSelectedTimeControlOption(timeControlOption);
    };

    const { imgSrc: rookImgSrc, altText: rookAltText } = getPiece('white_rook');
    const logoImgSrc = imgSrcMap[rookImgSrc] ?? rookImgSrc;

    const selectedRoomTypeForms = ROOM_TYPE_TO_FORMS_MAP[selectedRoomType];
    const formsContent = selectedRoomTypeForms.map((formKey) => {
        switch (formKey) {
            case 'time-control':
                return <TimeControlForm key="time-control-form" onTimeControlSelect={onTimeControlSelect} />;
            case 'side-select':
                return <SideSelectForm key="side-select-form" onSideSelect={onSideSelect} />;
            case 'display-name':
                return <DisplayNameForm key="display-name-form" onDisplayNameChange={onDisplayNameChange} />;
            default:
                return null;
        }
    });

    const handleStartClick = async () => {
        setErrorMessage(null);

        if (selectedRoomType === 'self') {
            const player1: Player = {
                id: 'player-1',
                displayName: selectedDisplayName ?? 'Player 1',
            };
            const player2: Player = {
                id: 'player-2',
                displayName: 'Player 2',
            };
            const players = [player1, player2];

            let playerIdToDisplayName: GameRoom['playerIdToDisplayName'] = {};
            let playerIdToScore: GameRoom['playerIdToScore'] = {};

            players.forEach(({ id, displayName }) => {
                playerIdToDisplayName[id] = displayName;
                playerIdToScore[id] = 0;
            });
            const gameRoom: GameRoom = {
                id: 'game-room',
                type: selectedRoomType,
                timeControl: selectedTimeControlOption,
                players,
                playerIdToDisplayName,
                playerIdToScore,
                colorToPlayerId: {
                    white: player1.id,
                    black: player2.id,
                },
                messages: [],
                gameCount: 1,
            };
            setRoom(gameRoom);
            return;
        }

        const data = await createGameRoom(
            selectedDisplayName ?? 'Player 1',
            selectedSide,
            selectedTimeControlOption ? selectedTimeControlOption.alias : null,
            selectedRoomType
        );

        if (!data || error) {
            setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
        }

        // TODO: start socket connection to get full room data. this console.log will be removed later
        console.log('Created game room:', data); // eslint-disable-line no-console
    };

    return (
        <main className="min-h-dvh font-serif bg-zinc-900 text-zinc-100">
            <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-4 sm:py-8">
                <header className="text-center sm:text-left">
                    <h1 className="flex items-center text-4xl font-display font-bold tracking-tight text-white sm:text-5xl">
                        <img src={logoImgSrc} alt={rookAltText} className="inline-block w-16 h-16" />
                        Grouchess
                    </h1>
                    <p className="mt-3 text-base text-zinc-300 sm:max-w-xl sm:text-lg">
                        Grouchess is a Lichess-clone project just for fun and learning
                    </p>
                </header>

                <div className="grid flex-1 gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <section className="flex flex-col gap-6 rounded-3xl border border-zinc-800 bg-zinc-950/60 p-8 shadow-2xl shadow-black/30">
                        <div className="flex items-center justify-between gap-4">
                            <h2 className="text-xl font-semibold text-zinc-100 sm:text-2xl">Start a game</h2>
                        </div>

                        <div className="space-y-4 flex-1">
                            {ROOM_TYPES.map(({ type, label, description }) => {
                                const isSelected = selectedRoomType === type;
                                return (
                                    <button
                                        key={`room-option-${type}`}
                                        type="button"
                                        className={`${ROOM_OPTION_CLASSES} ${isSelected ? 'ring-2 ring-emerald-500 bg-emerald-500/10' : 'bg-zinc-900/60'}`}
                                        onClick={() => setSelectedRoomType(type)}
                                    >
                                        <span className="text-lg font-semibold text-zinc-100">{label}</span>
                                        <span className="text-sm text-zinc-400">{description}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex flex-col gap-4">
                            {errorMessage && <span className="text-sm font-semibold text-red-500">{errorMessage}</span>}
                            <button
                                type="button"
                                disabled={loading}
                                className="cursor-pointer w-full rounded-2xl bg-emerald-700/90 px-6 py-4 text-center font-semibold text-zinc-100 transition hover:bg-emerald-700/100 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                                onClick={handleStartClick}
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center">
                                        <Spinner />
                                        Creating game room...
                                    </div>
                                ) : (
                                    'Start'
                                )}
                            </button>
                        </div>
                    </section>

                    <section className="flex flex-col gap-12 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-8 shadow-2xl shadow-emerald-900/20">
                        {formsContent}
                    </section>
                </div>
            </div>
        </main>
    );
}

export default MainMenuView;
