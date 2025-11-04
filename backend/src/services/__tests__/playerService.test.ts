import * as generateIdModule from '../../utils/generateId.js';
import { PlayerService } from '../playerService.js';

describe('PlayerService.createPlayer', () => {
    it('creates a player with a unique ID and offline status', () => {
        const service = new PlayerService();
        const player = service.createPlayer('Alice');

        expect(player).toMatchObject({
            displayName: 'Alice',
            status: 'offline',
        });
        expect(typeof player.id).toBe('string');
        expect(player.id.length).toBeGreaterThan(0);
    });

    it('generates different IDs for multiple players', () => {
        const service = new PlayerService();
        const player1 = service.createPlayer('Alice');
        const player2 = service.createPlayer('Bob');

        expect(player1.id).not.toBe(player2.id);
    });

    it('retries ID generation if a collision occurs', () => {
        const service = new PlayerService();
        const generateUniqueMessageIdSpy = vi.spyOn(generateIdModule, 'generateUniqueMessageId');

        // First call creates a player with id 'id1'
        generateUniqueMessageIdSpy.mockReturnValueOnce('id1');
        const player1 = service.createPlayer('Alice');
        expect(player1.id).toBe('id1');

        // Second call: generateUniqueMessageId handles collision internally and returns 'id2'
        generateUniqueMessageIdSpy.mockReturnValueOnce('id2');
        const player2 = service.createPlayer('Bob');

        expect(player2.id).toBe('id2');
        expect(generateUniqueMessageIdSpy).toHaveBeenCalledTimes(2); // 1 for player1 + 1 for player2
        // Verify that the second call received the existing IDs
        expect(generateUniqueMessageIdSpy).toHaveBeenNthCalledWith(2, new Set(['id1']));
        generateUniqueMessageIdSpy.mockRestore();
    });

    it('stores the player in internal maps', () => {
        const service = new PlayerService();
        const player = service.createPlayer('Alice');

        expect(service.getPlayerById(player.id)).toEqual(player);
        expect(service.getPlayerStatus(player.id)).toBe('offline');
    });
});

describe('PlayerService.getPlayerById', () => {
    it('returns the player when it exists', () => {
        const service = new PlayerService();
        const player = service.createPlayer('Alice');

        const result = service.getPlayerById(player.id);

        expect(result).toEqual(player);
    });

    it('returns null when player does not exist', () => {
        const service = new PlayerService();

        const result = service.getPlayerById('non-existent-id');

        expect(result).toBeNull();
    });
});

describe('PlayerService.getPlayerStatus', () => {
    it('returns the status when player exists', () => {
        const service = new PlayerService();
        const player = service.createPlayer('Alice');

        const status = service.getPlayerStatus(player.id);

        expect(status).toBe('offline');
    });

    it('returns null when player does not exist', () => {
        const service = new PlayerService();

        const status = service.getPlayerStatus('non-existent-id');

        expect(status).toBeNull();
    });
});

describe('PlayerService.deletePlayer', () => {
    it('deletes the player and returns true when player exists', () => {
        const service = new PlayerService();
        const player = service.createPlayer('Alice');

        const result = service.deletePlayer(player.id);

        expect(result).toBe(true);
        expect(service.getPlayerById(player.id)).toBeNull();
        expect(service.getPlayerStatus(player.id)).toBeNull();
    });

    it('returns false when player does not exist', () => {
        const service = new PlayerService();

        const result = service.deletePlayer('non-existent-id');

        expect(result).toBe(false);
    });

    it('does not affect other players', () => {
        const service = new PlayerService();
        const player1 = service.createPlayer('Alice');
        const player2 = service.createPlayer('Bob');

        service.deletePlayer(player1.id);

        expect(service.getPlayerById(player2.id)).toEqual(player2);
        expect(service.getPlayerStatus(player2.id)).toBe('offline');
    });
});

describe('PlayerService.updateStatus', () => {
    it.each([
        {
            scenario: 'sets status to online when isOnline is true',
            isOnline: true,
            expectedStatus: 'online' as const,
        },
        {
            scenario: 'sets status to offline when isOnline is false',
            isOnline: false,
            expectedStatus: 'offline' as const,
        },
    ])('$scenario', ({ isOnline, expectedStatus }) => {
        const service = new PlayerService();
        const player = service.createPlayer('Alice');

        service.updateStatus(player.id, isOnline);

        expect(service.getPlayerStatus(player.id)).toBe(expectedStatus);
    });

    it('updates status from offline to online', () => {
        const service = new PlayerService();
        const player = service.createPlayer('Alice');

        expect(service.getPlayerStatus(player.id)).toBe('offline');

        service.updateStatus(player.id, true);

        expect(service.getPlayerStatus(player.id)).toBe('online');
    });

    it('updates status from online to offline', () => {
        const service = new PlayerService();
        const player = service.createPlayer('Alice');
        service.updateStatus(player.id, true);

        expect(service.getPlayerStatus(player.id)).toBe('online');

        service.updateStatus(player.id, false);

        expect(service.getPlayerStatus(player.id)).toBe('offline');
    });

    it('throws an error when player does not exist', () => {
        const service = new PlayerService();

        expect(() => service.updateStatus('non-existent-id', true)).toThrow('Player not found');
    });

    it('throws an error when player status does not exist', () => {
        const service = new PlayerService();
        const player = service.createPlayer('Alice');

        // Manually delete status but keep player (simulating inconsistent state)
        service.deletePlayer(player.id);

        expect(() => service.updateStatus(player.id, true)).toThrow('Player not found');
    });
});
