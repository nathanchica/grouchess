import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import invariant from 'tiny-invariant';

import type { Player, Message, GameRoom, TimeControl } from '../utils/types';

type GameRoomContextType = {
    room: GameRoom | null;
    setRoom: (room: GameRoom | null) => void;
    currentPlayerId: Player['id'] | null;
    setCurrentPlayerId: (playerId: Player['id'] | null) => void;
    startSelfPlayRoom: (timeControlOption: TimeControl | null) => void;
    increasePlayerScore: (playerId: Player['id'], halfPoint?: boolean) => void;
    addMessage: (message: Message) => void;
    swapColors: () => void;
    incrementGameCount: () => void;
};

const GameRoomContext = createContext<GameRoomContextType>({
    room: null,
    setRoom: () => {},
    currentPlayerId: null,
    setCurrentPlayerId: () => {},
    startSelfPlayRoom: () => {},
    increasePlayerScore: () => {},
    addMessage: () => {},
    swapColors: () => {},
    incrementGameCount: () => {},
});

export function useGameRoom(): GameRoomContextType {
    const context = useContext(GameRoomContext);
    invariant(context, 'useGameRoom must be used within GameRoomProvider');
    return context;
}

type Props = {
    children: ReactNode;
};

function GameRoomProvider({ children }: Props) {
    const [roomState, setRoomState] = useState<GameRoom | null>(null);
    const [currentPlayerIdState, setCurrentPlayerIdState] = useState<Player['id'] | null>(null);

    const setRoom = useCallback((room: GameRoom | null) => {
        setRoomState(room);
    }, []);

    const setCurrentPlayerId = useCallback((playerId: Player['id'] | null) => {
        setCurrentPlayerIdState(playerId);
    }, []);

    const startSelfPlayRoom = useCallback((timeControlOption: TimeControl | null) => {
        const player1: Player = {
            id: 'player-1',
            displayName: 'White',
        };
        const player2: Player = {
            id: 'player-2',
            displayName: 'Black',
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
            type: 'self',
            timeControl: timeControlOption,
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
        setRoomState(gameRoom);
    }, []);

    const addMessage = useCallback((message: Message) => {
        setRoomState((prevRoom) => {
            if (!prevRoom) throw new Error('No active room');
            return {
                ...prevRoom,
                messages: [...prevRoom.messages, message].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
            };
        });
    }, []);

    const increasePlayerScore = useCallback((playerId: Player['id'], halfPoint?: boolean) => {
        setRoomState((prevRoom) => {
            if (!prevRoom) throw new Error('No active room');
            const pointToAdd = halfPoint ? 0.5 : 1;
            return {
                ...prevRoom,
                playerIdToScore: {
                    ...prevRoom.playerIdToScore,
                    [playerId]: (prevRoom.playerIdToScore[playerId] ?? 0) + pointToAdd,
                },
            };
        });
    }, []);

    const swapColors = useCallback(() => {
        setRoomState((prevRoom) => {
            if (!prevRoom) throw new Error('No active room');
            return {
                ...prevRoom,
                colorToPlayerId: {
                    white: prevRoom.colorToPlayerId.black,
                    black: prevRoom.colorToPlayerId.white,
                },
            };
        });
    }, []);

    const incrementGameCount = useCallback(() => {
        setRoomState((prevRoom) => {
            if (!prevRoom) throw new Error('No active room');
            return {
                ...prevRoom,
                gameCount: prevRoom.gameCount + 1,
            };
        });
    }, []);

    const contextValue = useMemo<GameRoomContextType>(() => {
        return {
            room: roomState,
            setRoom,
            currentPlayerId: currentPlayerIdState,
            setCurrentPlayerId,
            startSelfPlayRoom,
            increasePlayerScore,
            addMessage,
            swapColors,
            incrementGameCount,
        };
    }, [
        roomState,
        setRoom,
        currentPlayerIdState,
        setCurrentPlayerId,
        startSelfPlayRoom,
        increasePlayerScore,
        addMessage,
        swapColors,
        incrementGameCount,
    ]);

    return <GameRoomContext.Provider value={contextValue}>{children}</GameRoomContext.Provider>;
}

export default GameRoomProvider;
