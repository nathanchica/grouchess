import { CreateGameRoomInput } from './gameRoomService.schemas.js';

import { generateId } from '../utils/generateId.js';
import { type GameRoom } from '../utils/schemas.js';

export class GameRoomService {
    gameRoomIdToGameRoom: Map<GameRoom['id'], GameRoom> = new Map();

    createGameRoom({ timeControl, roomType, creator, creatorColorInput }: CreateGameRoomInput): GameRoom {
        let id = generateId();
        while (this.gameRoomIdToGameRoom.has(id)) {
            id = generateId();
        }

        const creatorColor = creatorColorInput ?? (Math.random() < 0.5 ? 'white' : 'black');
        const gameRoom: GameRoom = {
            id,
            timeControl,
            players: [creator],
            playerIdToDisplayName: { [creator.id]: creator.displayName },
            playerIdToScore: { [creator.id]: 0 },
            colorToPlayerId: {
                [creatorColor]: creator.id,
                [creatorColor === 'white' ? 'black' : 'white']: null,
            } as GameRoom['colorToPlayerId'],
            messages: [],
            gameCount: 0,
            type: roomType,
        };
        this.gameRoomIdToGameRoom.set(id, gameRoom);
        return gameRoom;
    }

    getGameRoomById(roomId: string): GameRoom | null {
        return this.gameRoomIdToGameRoom.get(roomId) || null;
    }
}
