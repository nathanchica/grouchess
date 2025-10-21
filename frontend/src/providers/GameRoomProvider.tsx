import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import invariant from 'tiny-invariant';

import { type PieceColor } from '../utils/pieces';

export interface Player {
    id: string;
    displayName: string;
}

type MessageType = 'standard' | 'rematch' | 'draw-offer';

interface Message {
    id: string;
    type: MessageType;
    createdAt: Date;
    authorId: Player['id'];
    content?: string;
}

export type TimeControl = {
    alias: string;
    minutes: number;
    increment: number;
    displayText: string;
    mode?: 'fischer';
};

export type RoomType = 'self' | 'player-vs-cpu' | 'player-vs-player';

export type GameRoom = {
    // room id
    id: string;
    // room type
    type: RoomType;
    // time control for the room. if null, then unlimited time mode. correspondence is not supported.
    timeControl: TimeControl | null;
    // list of players in the game room
    players: Player[];
    // mapping of player id to display name for convenience
    playerIdToDisplayName: Record<Player['id'], Player['displayName']>;
    // mapping of player id to score
    playerIdToScore: Record<Player['id'], number>;
    // mapping of 'white' or 'black' to player id
    colorToPlayerId: Record<PieceColor, Player['id']>;
    // list of messages in the room
    messages: Message[];
    // number of games played in the room
    gameCount: number;
};

type GameRoomContextType = {
    room: GameRoom | null;
    setRoom: (room: GameRoom | null) => void;
    increasePlayerScore: (playerId: Player['id'], halfPoint?: boolean) => void;
    addMessage: (message: Message) => void;
    swapColors: () => void;
    incrementGameCount: () => void;
};

const GameRoomContext = createContext<GameRoomContextType>({
    room: null,
    setRoom: () => {},
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

    const setRoom = useCallback((room: GameRoom | null) => {
        setRoomState(room);
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
            increasePlayerScore,
            addMessage,
            swapColors,
            incrementGameCount,
        };
    }, [roomState, setRoom, increasePlayerScore, addMessage, swapColors, incrementGameCount]);

    return <GameRoomContext.Provider value={contextValue}>{children}</GameRoomContext.Provider>;
}

export default GameRoomProvider;
