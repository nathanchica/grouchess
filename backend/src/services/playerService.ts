import type { Player } from '../types.js';
import { generateId } from '../utils/generateId.js';

export class PlayerService {
    playerIdToPlayer: Map<string, Player> = new Map();

    createPlayer(displayName: string): Player {
        let id = generateId();
        while (this.playerIdToPlayer.has(id)) {
            id = generateId();
        }
        const player: Player = { id, displayName };
        this.playerIdToPlayer.set(id, player);
        return player;
    }

    getPlayerById(playerId: string): Player | null {
        return this.playerIdToPlayer.get(playerId) || null;
    }

    deletePlayer(playerId: string): boolean {
        return this.playerIdToPlayer.delete(playerId);
    }
}
