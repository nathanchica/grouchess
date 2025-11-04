import { describe, it, expect } from 'vitest';

import { createMockChessGameRoom, createMockGameRoom, createMockPlayer, createMockTimeControl } from '../gameRoom.js';

describe('Game Room Mock Factories', () => {
    describe('createMockPlayer', () => {
        it('should create default player', () => {
            const player = createMockPlayer();

            expect(player).toEqual({
                id: 'player-1',
                displayName: 'Player',
                status: 'online',
            });
        });

        it('should apply custom id', () => {
            const player = createMockPlayer({
                id: 'custom-id-123',
            });

            expect(player.id).toBe('custom-id-123');
            expect(player.displayName).toBe('Player');
            expect(player.status).toBe('online');
        });

        it('should apply custom displayName', () => {
            const player = createMockPlayer({
                displayName: 'Alice',
            });

            expect(player.id).toBe('player-1');
            expect(player.displayName).toBe('Alice');
            expect(player.status).toBe('online');
        });

        it('should apply custom status', () => {
            const player = createMockPlayer({
                status: 'away',
            });

            expect(player.id).toBe('player-1');
            expect(player.displayName).toBe('Player');
            expect(player.status).toBe('away');
        });

        it('should apply multiple overrides', () => {
            const player = createMockPlayer({
                id: 'player-456',
                displayName: 'Bob',
                status: 'offline',
            });

            expect(player).toEqual({
                id: 'player-456',
                displayName: 'Bob',
                status: 'offline',
            });
        });

        it.each([{ status: 'online' as const }, { status: 'offline' as const }, { status: 'away' as const }])(
            'should handle status: $status',
            ({ status }) => {
                const player = createMockPlayer({ status });

                expect(player.status).toBe(status);
            }
        );

        it('should create player without status', () => {
            const player = createMockPlayer({
                status: undefined,
            });

            expect(player.id).toBe('player-1');
            expect(player.displayName).toBe('Player');
            expect(player.status).toBeUndefined();
        });

        it('should handle alphanumeric display names', () => {
            const player = createMockPlayer({
                displayName: 'Player123',
            });

            expect(player.displayName).toBe('Player123');
        });

        it('should handle display names with spaces', () => {
            const player = createMockPlayer({
                displayName: 'Cool Player',
            });

            expect(player.displayName).toBe('Cool Player');
        });

        it('should create multiple distinct players', () => {
            const player1 = createMockPlayer({ id: 'p1', displayName: 'Alice' });
            const player2 = createMockPlayer({ id: 'p2', displayName: 'Bob' });

            expect(player1.id).toBe('p1');
            expect(player2.id).toBe('p2');
            expect(player1.displayName).toBe('Alice');
            expect(player2.displayName).toBe('Bob');
        });
    });

    describe('createMockTimeControl', () => {
        it('should create default time control (3|2)', () => {
            const timeControl = createMockTimeControl();

            expect(timeControl).toEqual({
                alias: '3|2',
                minutes: 3,
                increment: 2,
                displayText: '3|2',
            });
        });

        it('should apply custom alias', () => {
            const timeControl = createMockTimeControl({
                alias: '10|0',
            });

            expect(timeControl.alias).toBe('10|0');
        });

        it('should apply custom minutes', () => {
            const timeControl = createMockTimeControl({
                minutes: 10,
            });

            expect(timeControl.minutes).toBe(10);
        });

        it('should apply custom increment', () => {
            const timeControl = createMockTimeControl({
                increment: 5,
            });

            expect(timeControl.increment).toBe(5);
        });

        it('should apply custom displayText', () => {
            const timeControl = createMockTimeControl({
                displayText: '10 min',
            });

            expect(timeControl.displayText).toBe('10 min');
        });

        it.each([
            { alias: '1|0', minutes: 1, increment: 0, displayText: '1 min' },
            { alias: '3|0', minutes: 3, increment: 0, displayText: '3 min' },
            { alias: '5|0', minutes: 5, increment: 0, displayText: '5 min' },
            { alias: '10|0', minutes: 10, increment: 0, displayText: '10 min' },
            { alias: '3|2', minutes: 3, increment: 2, displayText: '3|2' },
            { alias: '15|10', minutes: 15, increment: 10, displayText: '15|10' },
        ])('should create time control $alias', (timeControl) => {
            const result = createMockTimeControl(timeControl);

            expect(result.alias).toBe(timeControl.alias);
            expect(result.minutes).toBe(timeControl.minutes);
            expect(result.increment).toBe(timeControl.increment);
            expect(result.displayText).toBe(timeControl.displayText);
        });

        it('should handle mode field', () => {
            const timeControl = createMockTimeControl({
                mode: 'fischer',
            });

            expect(timeControl.mode).toBe('fischer');
        });
    });

    describe('createMockGameRoom', () => {
        it('should create default game room', () => {
            const room = createMockGameRoom();

            expect(room).toEqual({
                id: 'room-1',
                type: 'player-vs-player',
                players: [],
                playerIdToDisplayName: {},
                playerIdToScore: {},
                gameCount: 0,
            });
        });

        it('should apply custom id', () => {
            const room = createMockGameRoom({
                id: 'custom-room-123',
            });

            expect(room.id).toBe('custom-room-123');
        });

        it('should apply custom type', () => {
            const room = createMockGameRoom({
                type: 'self',
            });

            expect(room.type).toBe('self');
        });

        it('should apply custom players', () => {
            const players = [
                createMockPlayer({ id: 'p1', displayName: 'Alice' }),
                createMockPlayer({ id: 'p2', displayName: 'Bob' }),
            ];
            const room = createMockGameRoom({
                players,
            });

            expect(room.players).toHaveLength(2);
            expect(room.players[0].displayName).toBe('Alice');
            expect(room.players[1].displayName).toBe('Bob');
        });

        it('should apply custom playerIdToDisplayName', () => {
            const room = createMockGameRoom({
                playerIdToDisplayName: {
                    p1: 'Alice',
                    p2: 'Bob',
                },
            });

            expect(room.playerIdToDisplayName).toEqual({
                p1: 'Alice',
                p2: 'Bob',
            });
        });

        it('should apply custom playerIdToScore', () => {
            const room = createMockGameRoom({
                playerIdToScore: {
                    p1: 5,
                    p2: 3,
                },
            });

            expect(room.playerIdToScore).toEqual({
                p1: 5,
                p2: 3,
            });
        });

        it('should apply custom gameCount', () => {
            const room = createMockGameRoom({
                gameCount: 10,
            });

            expect(room.gameCount).toBe(10);
        });

        it.each([{ type: 'self' as const }, { type: 'player-vs-cpu' as const }, { type: 'player-vs-player' as const }])(
            'should create room with type: $type',
            ({ type }) => {
                const room = createMockGameRoom({ type });

                expect(room.type).toBe(type);
            }
        );
    });

    describe('createMockChessGameRoom', () => {
        it('should create default chess game room', () => {
            const room = createMockChessGameRoom();

            expect(room).toEqual({
                id: 'room-1',
                type: 'player-vs-player',
                players: [],
                playerIdToDisplayName: {},
                playerIdToScore: {},
                gameCount: 0,
                timeControl: null,
                colorToPlayerId: {
                    white: null,
                    black: null,
                },
            });
        });

        it('should apply custom timeControl', () => {
            const timeControl = createMockTimeControl({
                alias: '10|0',
                minutes: 10,
                increment: 0,
                displayText: '10 min',
            });
            const room = createMockChessGameRoom({
                timeControl,
            });

            expect(room.timeControl).toEqual(timeControl);
        });

        it('should apply custom colorToPlayerId', () => {
            const room = createMockChessGameRoom({
                colorToPlayerId: {
                    white: 'player-1',
                    black: 'player-2',
                },
            });

            expect(room.colorToPlayerId).toEqual({
                white: 'player-1',
                black: 'player-2',
            });
        });

        it('should create chess game room with players and colors', () => {
            const room = createMockChessGameRoom({
                players: [
                    createMockPlayer({ id: 'p1', displayName: 'Alice' }),
                    createMockPlayer({ id: 'p2', displayName: 'Bob' }),
                ],
                colorToPlayerId: {
                    white: 'p1',
                    black: 'p2',
                },
                playerIdToDisplayName: {
                    p1: 'Alice',
                    p2: 'Bob',
                },
            });

            expect(room.players).toHaveLength(2);
            expect(room.colorToPlayerId.white).toBe('p1');
            expect(room.colorToPlayerId.black).toBe('p2');
            expect(room.playerIdToDisplayName.p1).toBe('Alice');
            expect(room.playerIdToDisplayName.p2).toBe('Bob');
        });

        it('should inherit all GameRoom properties', () => {
            const room = createMockChessGameRoom({
                id: 'custom-room',
                type: 'self',
                gameCount: 5,
            });

            expect(room.id).toBe('custom-room');
            expect(room.type).toBe('self');
            expect(room.gameCount).toBe(5);
        });

        it('should handle null timeControl', () => {
            const room = createMockChessGameRoom({
                timeControl: null,
            });

            expect(room.timeControl).toBeNull();
        });

        it('should handle partial colorToPlayerId', () => {
            const room = createMockChessGameRoom({
                colorToPlayerId: {
                    white: 'player-white',
                    black: null,
                },
            });

            expect(room.colorToPlayerId.white).toBe('player-white');
            expect(room.colorToPlayerId.black).toBeNull();
        });
    });
});
