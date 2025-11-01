import type { Player, PlayerStatus } from '@grouchess/game-room';

import { generateId } from '../utils/generateId.js';

export class PlayerService {
    private playerIdToPlayer: Map<Player['id'], Player> = new Map();
    private playerIdToStatus: Map<Player['id'], PlayerStatus> = new Map();

    private getPlayerWithStatus(playerId: string): { player: Player; status: PlayerStatus } | null {
        const player = this.getPlayerById(playerId);
        const status = this.getPlayerStatus(playerId);
        if (!player || !status) {
            return null;
        }
        return { player, status };
    }

    createPlayer(displayName: Player['displayName']): Player {
        let id = generateId();
        while (this.playerIdToPlayer.has(id)) {
            id = generateId();
        }
        const player: Player = { id, displayName, status: 'offline' };
        this.playerIdToPlayer.set(id, player);
        this.playerIdToStatus.set(id, 'offline');
        return player;
    }

    getPlayerById(playerId: string): Player | null {
        return this.playerIdToPlayer.get(playerId) || null;
    }

    getPlayerStatus(playerId: string): PlayerStatus | null {
        return this.playerIdToStatus.get(playerId) || null;
    }

    deletePlayer(playerId: string): boolean {
        const deletedFromStatus = this.playerIdToStatus.delete(playerId);
        const deletedFromPlayer = this.playerIdToPlayer.delete(playerId);
        return deletedFromStatus || deletedFromPlayer;
    }

    updateStatus(playerId: string, isOnline: boolean): void {
        const playerWithStatus = this.getPlayerWithStatus(playerId);
        if (!playerWithStatus) {
            throw new Error('Player not found');
        }
        this.playerIdToStatus.set(playerId, isOnline ? 'online' : 'offline');
    }
}
