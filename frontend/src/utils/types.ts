import { type PieceColor } from '@grouchess/chess';

export interface Player {
    id: string;
    displayName: string;
}

export type MessageType = 'standard' | 'rematch' | 'draw-offer';

export interface Message {
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

export type WaitingRoom = {
    roomId: GameRoom['id'];
    playerId: Player['id'];
    token: string;
    isCreator: boolean;
};
