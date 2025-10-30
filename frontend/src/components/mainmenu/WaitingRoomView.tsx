import { useCallback } from 'react';

import type { JoinGameRoomResponse } from '@grouchess/http-schemas';
import { useParams } from 'react-router';
import invariant from 'tiny-invariant';

import ChallengerWaitingRoom from './ChallengerWaitingRoom';
import CreatorWaitingRoom from './CreatorWaitingRoom';

import { useWaitingRoom } from '../../hooks/useWaitingRoom';

/**
 * Visiting a /:roomId URL will land in this waiting room view. There are two scenarios:
 *
 * 1. CreatorWaitingRoom -- The user created the room from the GameRoomForm and is redirected here upon creation.
 * The waiting room data (isCreator, playerId, token) is passed via location (react router's useLocation) state and is
 * also stored in session storage for persistence across page reloads.
 *
 * 2. ChallengerWaitingRoom -- The user is joining an existing room (e.g., via a shared link). On load, the component
 * fetches the room info from the backend to display basic room details. The user can enter their display name and
 * join the room. Upon joining, the waiting room data (playerId, token) is returned from the joinGameRoom request and
 * is stored in session storage for persistence.
 *
 * To start a chess game, both the creator and challenger need to authenticate their socket connections (with their
 * tokens) and emit a 'wait_for_game' event upon successful authentication. The CreatorWaitingRoom handles
 * authenticating the socket automatically on load, while the ChallengerWaitingRoom does so upon successfully joining
 * the room. When both users have joined, the server will emit a 'game_room_ready' event to both clients, which triggers
 * fetching the chess game data in ViewController and transitioning to the ChessGameView.
 *
 * If a user (either creator or challenger) reloads the page, the waiting room data is retrieved from session storage
 * to re-authenticate the socket and re-join the game room automatically.
 */
function WaitingRoomView() {
    const { roomId } = useParams<{ roomId: string }>();
    invariant(roomId, 'roomId param is required');
    const { waitingRoomData, loadData } = useWaitingRoom(roomId);

    const onJoinGameRoom = useCallback(
        (payload: JoinGameRoomResponse) => {
            loadData(payload);
        },
        [loadData]
    );

    return (
        <section className="flex flex-col gap-6 w-2xl rounded-3xl border border-zinc-800 bg-zinc-950/60 p-16 shadow-2xl shadow-black/30">
            {waitingRoomData?.isCreator ? (
                <CreatorWaitingRoom roomId={roomId} />
            ) : (
                <ChallengerWaitingRoom roomId={roomId} onJoinGameRoom={onJoinGameRoom} />
            )}
        </section>
    );
}

export default WaitingRoomView;
