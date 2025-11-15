import { useState, use } from 'react';

import { GetGameRoomBasicInfoResponseSchema } from '@grouchess/http-schemas';
import type { GetGameRoomBasicInfoResponse, JoinGameRoomResponse } from '@grouchess/http-schemas';
import { useNavigate } from 'react-router';

import DisplayNameForm from './DisplayNameForm';

import { useJoinGameRoom } from '../../hooks/useJoinGameRoom';
import { getEnv } from '../../utils/config';
import { getCachedPromise, fetchWithSchemasOrThrow } from '../../utils/fetch';

async function fetchRoomBasicInfo(roomId: string): Promise<GetGameRoomBasicInfoResponse> {
    const url = `${getEnv().VITE_API_BASE_URL}/room/${roomId}`;
    return fetchWithSchemasOrThrow(url, {
        successSchema: GetGameRoomBasicInfoResponseSchema,
        errorMessage: 'Failed to fetch room info.',
    });
}

export type ChallengerWaitingRoomProps = {
    roomId: string;
    onJoinGameRoom: (payload: JoinGameRoomResponse) => void;
};

function ChallengerWaitingRoom({ roomId, onJoinGameRoom }: ChallengerWaitingRoomProps) {
    const { timeControl } = use(getCachedPromise(`getGameRoomBasicInfo:${roomId}`, () => fetchRoomBasicInfo(roomId)));

    const navigate = useNavigate();
    const { joinGameRoom, loading: isJoining } = useJoinGameRoom(roomId);

    const [displayName, setDisplayName] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const joinButtonIsDisabled = isJoining;

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

    const timeControlDisplayText = timeControl?.displayText || 'Unlimited';

    return (
        <div className="flex flex-col gap-8">
            <h2 className="text-2xl font-bold text-zinc-100 sm:text-3xl">Join Game</h2>

            <section className="flex flex-col gap-8">
                <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 p-6 space-y-4">
                    <div className="flex flex-col gap-2">
                        <span className="text-zinc-400 text-sm font-medium uppercase tracking-wide">Room ID</span>
                        <span className="text-zinc-100 text-lg font-mono">{roomId}</span>
                    </div>

                    <div className="h-px bg-zinc-700/50" />

                    <div className="flex flex-col gap-2">
                        <span className="text-zinc-400 text-sm font-medium uppercase tracking-wide">Time Control</span>
                        <span className="text-zinc-100 text-lg">{timeControlDisplayText}</span>
                    </div>
                </div>

                <DisplayNameForm
                    onDisplayNameChange={(name) => setDisplayName(name)}
                    labelClassName="text-sm font-medium text-zinc-300"
                />
            </section>

            {errorMessage && (
                <div role="alert" className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3">
                    <p className="text-red-400 font-medium">{errorMessage}</p>
                </div>
            )}

            <section className="flex flex-col gap-3 sm:flex-row">
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
            </section>
        </div>
    );
}

export default ChallengerWaitingRoom;
