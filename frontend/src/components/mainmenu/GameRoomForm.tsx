import { useState } from 'react';

import type { PieceColor, RoomType, TimeControl } from '@grouchess/models';
import { useNavigate } from 'react-router';

import { useCreateGameRoom } from '../../hooks/useCreateGameRoom';
import type { WaitingRoom } from '../../utils/types';
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
    // TODO: Re-enable player-vs-cpu option in the future
    // {
    //     type: 'player-vs-cpu',
    //     label: 'Play against a Computer',
    //     description: 'Face a computer opponent',
    // },
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

const DEFAULT_SIDE: PieceColor = 'white';

type Props = {
    onSelfPlayStart: (timeControl: TimeControl | null) => void;
};

function GameRoomForm({ onSelfPlayStart }: Props) {
    const { createGameRoom, loading } = useCreateGameRoom();
    const navigate = useNavigate();

    const [selectedRoomType, setSelectedRoomType] = useState<RoomType>(DEFAULT_ROOM_TYPE);
    const [selectedTimeControlOption, setSelectedTimeControlOption] = useState<TimeControl | null>(null);
    const [selectedDisplayName, setSelectedDisplayName] = useState<string | null>(null);
    const [selectedSide, setSelectedSide] = useState<PieceColor | null>(DEFAULT_SIDE);
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

    const selectedRoomTypeForms = ROOM_TYPE_TO_FORMS_MAP[selectedRoomType];
    const formsContent = selectedRoomTypeForms.map((formKey) => {
        switch (formKey) {
            case 'time-control':
                return <TimeControlForm key="time-control-form" onTimeControlSelect={onTimeControlSelect} />;
            case 'side-select':
                return <SideSelectForm key="side-select-form" initialSide={DEFAULT_SIDE} onSideSelect={onSideSelect} />;
            case 'display-name':
                return <DisplayNameForm key="display-name-form" onDisplayNameChange={onDisplayNameChange} />;
            /* v8 ignore next -- @preserve */
            default:
                return null;
        }
    });
    const startButtonText = loading ? 'Creating game room...' : 'Start';

    const onRoomCreated = (newWaitingRoom: WaitingRoom) => {
        navigate(`/${newWaitingRoom.roomId}`, {
            state: newWaitingRoom,
        });
    };

    const handleStartClick = () => {
        setErrorMessage(null);

        if (selectedRoomType === 'self') {
            onSelfPlayStart(selectedTimeControlOption);
            return;
        }

        createGameRoom({
            displayName: selectedDisplayName,
            color: selectedSide,
            timeControlAlias: selectedTimeControlOption ? selectedTimeControlOption.alias : null,
            roomType: selectedRoomType,
            onSuccess: (data) => {
                onRoomCreated({ ...data, isCreator: true });
            },
            onError: ({ message }) => {
                setErrorMessage(message);
            },
        });
    };

    return (
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
                                aria-pressed={isSelected ? 'true' : 'false'}
                            >
                                <span className="text-lg font-semibold text-zinc-100">{label}</span>
                                <span className="text-sm text-zinc-400">{description}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex flex-col gap-4">
                    {errorMessage && (
                        <span role="alert" className="text-sm font-semibold text-red-500">
                            {errorMessage}
                        </span>
                    )}
                    <button
                        type="button"
                        disabled={loading}
                        className="cursor-pointer w-full rounded-2xl bg-emerald-700/90 px-6 py-4 text-center font-semibold text-zinc-100 transition hover:bg-emerald-700/100 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                        onClick={handleStartClick}
                        aria-label={startButtonText}
                    >
                        {loading ? (
                            <div role="status" className="flex gap-2.5 items-center justify-center">
                                <Spinner />
                                {startButtonText}
                            </div>
                        ) : (
                            <>{startButtonText}</>
                        )}
                    </button>
                </div>
            </section>

            <section className="flex flex-col min-h-[750px] gap-12 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-8 shadow-2xl shadow-emerald-900/20">
                {formsContent}
            </section>
        </div>
    );
}

export default GameRoomForm;
