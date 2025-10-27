import type { Player } from '@grouchess/game-room';

import { generateId } from '../utils/generateId.js';

export class PlayerService {
    playerIdToPlayer: Map<string, Player> = new Map();

    createPlayer(displayName: string): Player {
        let id = generateId();
        while (this.playerIdToPlayer.has(id)) {
            id = generateId();
        }
        const player: Player = { id, displayName, isOnline: false };
        this.playerIdToPlayer.set(id, player);
        return player;
    }

    getPlayerById(playerId: string): Player | null {
        return this.playerIdToPlayer.get(playerId) || null;
    }

    deletePlayer(playerId: string): boolean {
        return this.playerIdToPlayer.delete(playerId);
    }

    updateStatus(playerId: string, isOnline: boolean): void {
        const player = this.getPlayerById(playerId);
        if (!player) {
            throw new Error('Player not found');
        }
        player.isOnline = isOnline;
    }
}
