import { useCallback, useEffect, useState } from 'react';

import type { TimeControl } from '@grouchess/game-room';
import type { GetChessGameResponse } from '@grouchess/http-schemas';

import ChessGameView from './ChessGameView';
import MainMenuView from './MainMenuView';

import { useFetchChessGame } from '../../hooks/useFetchChessGame';
import { useAuth } from '../../providers/AuthProvider';
import {
    createInitialChessClockState,
    createSelfPlayChessGameRoomState,
    type ChessGameRoomState,
} from '../../providers/ChessGameRoomProvider';
import { useSocket } from '../../providers/SocketProvider';
import { rebaseServerClockToPerf } from '../../utils/clock';

/**
 * Controls which main view to show based on whether the chess game data has been loaded.
 * Listens for 'game_room_ready' socket event to trigger fetching the chess game data.
 */
function ViewController() {
    const { socket } = useSocket();
    const { fetchChessGameData } = useFetchChessGame();
    const { token, roomId } = useAuth();

    const [initialChessGameData, setInitialChessGameData] = useState<GetChessGameResponse | null>(null);
    const initialChessGameRoomData: ChessGameRoomState | null = initialChessGameData
        ? {
              chessGame: {
                  ...initialChessGameData.chessGame,
                  previousMoveIndices: [],
                  timelineVersion: 0,
                  pendingPromotion: null,
              },
              gameRoom: initialChessGameData.gameRoom,
              clockState: initialChessGameData.clockState
                  ? rebaseServerClockToPerf(initialChessGameData.clockState)
                  : null,
              currentPlayerId: initialChessGameData.playerId,
          }
        : null;

    const onSelfPlayStart = useCallback((timeControl: TimeControl | null) => {
        const selfPlayGameRoomState: ChessGameRoomState = createSelfPlayChessGameRoomState(timeControl);
        setInitialChessGameData({
            chessGame: selfPlayGameRoomState.chessGame,
            gameRoom: selfPlayGameRoomState.gameRoom,
            playerId: selfPlayGameRoomState.currentPlayerId,
            clockState: timeControl ? createInitialChessClockState(timeControl) : null,
        });
    }, []);

    const fetchChessGameRoom = useCallback(() => {
        if (token && roomId) {
            fetchChessGameData({
                roomId,
                token,
                onSuccess: (data: GetChessGameResponse) => {
                    setInitialChessGameData(data);
                },
                onError: (error) => {
                    console.error('Failed to fetch chess game data:', error);
                },
            });
        }
    }, [token, roomId, fetchChessGameData]);

    useEffect(() => {
        socket.on('game_room_ready', fetchChessGameRoom);
        return () => {
            socket.off('game_room_ready', fetchChessGameRoom);
        };
    }, [fetchChessGameRoom, socket]);

    return (
        <>
            {initialChessGameRoomData ? (
                <ChessGameView
                    key={`${initialChessGameRoomData.gameRoom.id}-${initialChessGameRoomData.gameRoom.gameCount}`}
                    initialChessGameRoomData={initialChessGameRoomData}
                />
            ) : (
                <MainMenuView onSelfPlayStart={onSelfPlayStart} />
            )}
        </>
    );
}

export default ViewController;
