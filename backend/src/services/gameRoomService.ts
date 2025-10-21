import { getTimeControlByAlias } from '../data/timeControl.js';
import type { Player, GameRoom, PieceColor, RoomType } from '../types.js';
import { generateId } from '../utils/generateId.js';

export class GameRoomService {
    gameRoomIdToGameRoom: Map<GameRoom['id'], GameRoom> = new Map();

    createGameRoom(
        timeControlAlias: string | null,
        roomType: RoomType,
        creator: Player,
        creatorColorInput: PieceColor | null
    ): GameRoom {
        let id = generateId();
        while (this.gameRoomIdToGameRoom.has(id)) {
            id = generateId();
        }

        const creatorColor = creatorColorInput ?? (Math.random() < 0.5 ? 'white' : 'black');
        const gameRoom: GameRoom = {
            id,
            timeControl: timeControlAlias ? getTimeControlByAlias(timeControlAlias) : null,
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
