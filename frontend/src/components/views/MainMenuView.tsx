import { useState } from 'react';

import { useImages } from '../../providers/ImagesProvider';
import { getPiece } from '../../utils/pieces';
import DisplayNameForm from '../mainmenu/DisplayNameForm';
import SideSelectForm from '../mainmenu/SideSelectForm';
import TimeControlForm from '../mainmenu/TimeControlForm';

const ROOM_OPTION_CLASSES =
    'flex w-full cursor-pointer flex-col items-start gap-1 rounded-2xl border border-zinc-800 px-6 py-5 text-left transition hover:border-emerald-400/50 hover:bg-emerald-500/10 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-emerald-400';

const ROOM_TYPES = [
    {
        id: 'player-vs-player',
        label: 'Play against a Friend',
        description: 'Create a private room and share the link',
    },
    {
        id: 'player-vs-cpu',
        label: 'Play against a Computer',
        description: 'Face a computer opponent',
    },
    {
        id: 'self',
        label: 'Self-Play',
        description: 'Play both sides of the board',
    },
];
const DEFAULT_ROOM_TYPE = ROOM_TYPES[0].id;

const FORMS = ['time-control', 'side-select', 'display-name'];
const ROOM_TYPE_TO_FORMS_MAP: Record<string, string[]> = {
    'player-vs-player': FORMS,
    'player-vs-cpu': ['time-control', 'side-select'],
    self: ['time-control'],
};

function MainMenuView() {
    const { imgSrcMap } = useImages();

    const [selectedRoomType, setSelectedRoomType] = useState<string>(DEFAULT_ROOM_TYPE);
    const [selectedTimeControlAlias, setSelectedTimeControlAlias] = useState<string | null>(null);
    const [selectedDisplayName, setSelectedDisplayName] = useState<string | null>(null);
    const [selectedSide, setSelectedSide] = useState<string | null>(null);

    const onDisplayNameChange = (name: string) => {
        setSelectedDisplayName(name);
    };

    const onSideSelect = (side: string | null) => {
        setSelectedSide(side);
    };

    const onTimeControlSelect = (timeControlAlias: string | null) => {
        setSelectedTimeControlAlias(timeControlAlias);
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

    const handleStartClick = () => {
        // TODO: implement start game logic, console.log for now (will be removed later)
        console.log('Starting game with settings:'); // eslint-disable-line no-console
        console.log('Room Type:', selectedRoomType); // eslint-disable-line no-console
        console.log('Time Control:', selectedTimeControlAlias); // eslint-disable-line no-console
        console.log('Side:', selectedSide); // eslint-disable-line no-console
        console.log('Display Name:', selectedDisplayName); // eslint-disable-line no-console
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
                        Grouchess is a Lichess-clone project just for fun and learning.
                    </p>
                </header>

                <div className="grid flex-1 gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <section className="flex flex-col gap-6 rounded-3xl border border-zinc-800 bg-zinc-950/60 p-8 shadow-2xl shadow-black/30">
                        <div className="flex items-center justify-between gap-4">
                            <h2 className="text-xl font-semibold text-zinc-100 sm:text-2xl">Start a game</h2>
                        </div>

                        <div className="space-y-4 flex-1">
                            {ROOM_TYPES.map(({ id, label, description }) => {
                                const isSelected = selectedRoomType === id;
                                return (
                                    <button
                                        key={`room-option-${id}`}
                                        type="button"
                                        className={`${ROOM_OPTION_CLASSES} ${isSelected ? 'ring-2 ring-emerald-500 bg-emerald-500/10' : 'bg-zinc-900/60'}`}
                                        onClick={() => setSelectedRoomType(id)}
                                    >
                                        <span className="text-lg font-semibold text-zinc-100">{label}</span>
                                        <span className="text-sm text-zinc-400">{description}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            className="mt-8 cursor-pointer w-full rounded-2xl bg-emerald-500/90 px-6 py-4 text-center font-semibold text-zinc-900 transition hover:bg-emerald-500/100 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                            onClick={handleStartClick}
                        >
                            Start
                        </button>
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
