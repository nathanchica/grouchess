import { useEffect, useState } from 'react';

import type { TimeControl } from '@grouchess/game-room';
import type { JoinGameRoomResponse } from '@grouchess/http-schemas';
import { useNavigate } from 'react-router';

import DisplayNameForm from './DisplayNameForm';

import { useJoinGameRoom } from '../../hooks/useJoinGameRoom';

type RoomInfoResponse = {
    roomId: string;
    timeControl: TimeControl;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const ROOM_ENDPOINT = apiBaseUrl ? `${apiBaseUrl}/room` : null;

type Props = {
    roomId: string;
    onJoinGameRoom: (payload: JoinGameRoomResponse) => void;
};

function ChallengerWaitingRoom({ roomId, onJoinGameRoom }: Props) {
    const navigate = useNavigate();
    const { joinGameRoom, loading: isJoining } = useJoinGameRoom(roomId);

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [roomBasicInfo, setRoomBasicInfo] = useState<RoomInfoResponse | null>(null);
    const [displayName, setDisplayName] = useState<string>('');

    useEffect(() => {
        if (!ROOM_ENDPOINT) {
            setErrorMessage('Room endpoint is not configured.');
            return;
        }

        let isMounted = true;

        const fetchRoomInfo = async () => {
            setIsLoading(true);
            setErrorMessage(null);

            try {
                const response = await fetch(`${ROOM_ENDPOINT}/${roomId}`);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    setErrorMessage(errorData.error || 'Failed to fetch room info.');
                    return;
                }

                const data: RoomInfoResponse = await response.json();
                if (isMounted) {
                    setRoomBasicInfo(data);
                }
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(error instanceof Error ? error.message : 'Failed to fetch room info.');
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchRoomInfo();

        return () => {
            isMounted = false;
        };
    }, [roomId]);

    const joinButtonIsDisabled = isLoading || isJoining;

    const handleJoinRoomClick = () => {
        setErrorMessage(null);

        joinGameRoom({
            displayName,
            onSuccess: onJoinGameRoom,
            onError: ({ message }) => {
                setErrorMessage(message);
            },
        });
    };

    let timeControlDisplayText;
    if (roomBasicInfo) {
        const { timeControl } = roomBasicInfo;
        timeControlDisplayText = timeControl?.displayText || 'Unlimited';
    }

    return (
        <div className="flex flex-col gap-8">
            <h2 className="text-2xl font-bold text-zinc-100 sm:text-3xl">Join Game</h2>

            {isLoading && (
                <div className="flex items-center gap-3 py-4">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    <p className="text-zinc-300">Loading room information...</p>
                </div>
            )}

            {errorMessage && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3">
                    <p className="text-red-400 font-medium">Error: {errorMessage}</p>
                </div>
            )}

            {!isLoading && !errorMessage && roomBasicInfo && (
                <div className="flex flex-col gap-8">
                    <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 p-6 space-y-4">
                        <div className="flex flex-col gap-2">
                            <span className="text-zinc-400 text-sm font-medium uppercase tracking-wide">Room ID</span>
                            <span className="text-zinc-100 text-lg font-mono">{roomId}</span>
                        </div>

                        <div className="h-px bg-zinc-700/50" />

                        <div className="flex flex-col gap-2">
                            <span className="text-zinc-400 text-sm font-medium uppercase tracking-wide">
                                Time Control
                            </span>
                            <span className="text-zinc-100 text-lg">{timeControlDisplayText}</span>
                        </div>
                    </div>

                    <DisplayNameForm
                        onDisplayNameChange={(name) => setDisplayName(name)}
                        labelClassName="text-sm font-medium text-zinc-300"
                    />
                </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
                <button
                    type="button"
                    className="flex-1 rounded-lg cursor-pointer bg-emerald-700/90 px-6 py-2.5 font-semibold text-zinc-100 hover:bg-emerald-700/100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    onClick={handleJoinRoomClick}
                    disabled={joinButtonIsDisabled}
                >
                    {isJoining ? 'Joining...' : 'Join Game'}
                </button>

                <button
                    type="button"
                    className="rounded-lg cursor-pointer px-6 py-2.5 font-semibold text-zinc-100 hover:border-zinc-600 transition-colors border border-zinc-700"
                    onClick={() => navigate('/')}
                >
                    Back
                </button>
            </div>
        </div>
    );
}

export default ChallengerWaitingRoom;
