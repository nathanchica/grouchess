import { useEffect, useState } from 'react';

import { useNavigate, useParams } from 'react-router';
import invariant from 'tiny-invariant';

import DisplayNameForm from './DisplayNameForm';

import { useJoinGameRoom } from '../../hooks/useJoinGameRoom';
import { useGameRoom } from '../../providers/GameRoomProvider';
import { useGameRoomSocket } from '../../providers/GameRoomSocketProvider';
import { type WaitingRoom, type TimeControl } from '../../utils/types';
import CopyableTextField from '../common/CopyableTextField';

type RoomInfoResponse = {
    roomId: string;
    timeControl: TimeControl;
};

type Props = {
    roomToken?: WaitingRoom['token'];
    isCreator: boolean;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const ROOM_ENDPOINT = apiBaseUrl ? `${apiBaseUrl}/room` : null;

function WaitingRoomView({ roomToken, isCreator }: Props) {
    const { roomId } = useParams<{ roomId: string }>();
    invariant(roomId, 'roomId param is required');

    const navigate = useNavigate();
    const { connectToRoom } = useGameRoomSocket();
    const { joinGameRoom, loading: isJoining } = useJoinGameRoom(roomId);
    const { setCurrentPlayerId } = useGameRoom();

    const [isCreatorState, setIsCreatorState] = useState(isCreator);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [roomBasicInfo, setRoomBasicInfo] = useState<RoomInfoResponse | null>(null);
    const [displayName, setDisplayName] = useState<string>('');

    const shareUrl = `${window.location.origin}/${roomId}`;

    useEffect(() => {
        if (roomToken) {
            connectToRoom(roomToken);
            return;
        }

        const key = `token:${roomId}`;
        const stored = sessionStorage.getItem(key);
        if (stored) {
            const parsed: WaitingRoom = JSON.parse(stored);
            setIsCreatorState(parsed.isCreator);
            connectToRoom(parsed.token);
            return;
        }

        if (!ROOM_ENDPOINT) {
            setErrorMessage('Room endpoint is not configured.');
            return;
        }

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
                setRoomBasicInfo(data);
            } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : 'Failed to fetch room info.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchRoomInfo();
    }, [roomId, roomToken, connectToRoom]);

    const joinButtonIsDisabled = isLoading || isJoining;

    const handleJoinRoomClick = () => {
        setErrorMessage(null);
        joinGameRoom({
            displayName,
            onSuccess: ({ token, playerId }) => {
                connectToRoom(token);
                setCurrentPlayerId(playerId);
            },
            onError: ({ message }) => {
                setErrorMessage(message);
            },
        });
    };

    let content;
    if (isCreatorState) {
        content = (
            <div className="flex flex-col gap-8">
                <h2 className="text-2xl font-bold text-zinc-100 sm:text-3xl mb-2">Game Created!</h2>

                <CopyableTextField
                    text={shareUrl}
                    label="Share this link to invite a friend to play"
                    id="share-url"
                    copyButtonAriaLabel="Copy share URL"
                />

                <div className="flex flex-col items-center gap-4 py-6">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                        <p className="text-zinc-300 font-medium">Waiting for opponent to join...</p>
                    </div>
                    <p className="text-zinc-500 text-sm">The game will start automatically when someone joins</p>
                </div>

                <button
                    type="button"
                    className="rounded-lg cursor-pointer px-6 py-2.5 font-semibold text-white hover:border-red-600/80 transition-colors border border-red-400/40"
                    onClick={() => {
                        navigate('/');
                    }}
                >
                    Cancel Game
                </button>
            </div>
        );
    } else {
        let roomIdText;
        let timeControlDisplayText;
        if (roomBasicInfo) {
            const { roomId, timeControl } = roomBasicInfo || {};
            timeControlDisplayText = timeControl?.displayText || 'Unlimited';
            roomIdText = roomId;
        }
        content = (
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
                                <span className="text-zinc-400 text-sm font-medium uppercase tracking-wide">
                                    Room ID
                                </span>
                                <span className="text-zinc-100 text-lg font-mono">{roomIdText}</span>
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

    return (
        <section className="flex flex-col gap-6 w-2xl rounded-3xl border border-zinc-800 bg-zinc-950/60 p-16 shadow-2xl shadow-black/30">
            {content}
        </section>
    );
}

export default WaitingRoomView;
