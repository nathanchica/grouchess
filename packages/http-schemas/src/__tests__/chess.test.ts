import { CreateGameRoomRequestSchema, JoinGameRoomRequestSchema } from '../chess.js';

describe('CreateGameRoomRequestSchema', () => {
    describe('displayName default behavior', () => {
        it.each([
            {
                scenario: 'should use provided displayName',
                input: { displayName: 'Alice', roomType: 'player-vs-player' },
                expected: 'Alice',
            },
            {
                scenario: 'should default to "Player 1" when displayName is undefined',
                input: { displayName: undefined, roomType: 'player-vs-player' },
                expected: 'Player 1',
            },
            {
                scenario: 'should default to "Player 1" when displayName is null',
                input: { displayName: null, roomType: 'player-vs-player' },
                expected: 'Player 1',
            },
            {
                scenario: 'should default to "Player 1" when displayName is empty string',
                input: { displayName: '', roomType: 'player-vs-player' },
                expected: 'Player 1',
            },
            {
                scenario: 'should default to "Player 1" when displayName is not provided',
                input: { roomType: 'player-vs-player' },
                expected: 'Player 1',
            },
        ])('$scenario', ({ input, expected }) => {
            const result = CreateGameRoomRequestSchema.parse(input);
            expect(result.displayName).toBe(expected);
        });
    });

    describe('full schema validation', () => {
        it('should parse valid request with all fields', () => {
            const input = {
                displayName: 'Alice',
                color: 'white',
                timeControlAlias: '3|0',
                roomType: 'player-vs-player',
            };

            const result = CreateGameRoomRequestSchema.parse(input);

            expect(result.displayName).toBe('Alice');
            expect(result.color).toBe('white');
            expect(result.timeControlAlias).toBe('3|0');
            expect(result.roomType).toBe('player-vs-player');
        });

        it('should parse valid request with only required fields', () => {
            const input = {
                roomType: 'self',
            };

            const result = CreateGameRoomRequestSchema.parse(input);

            expect(result.displayName).toBe('Player 1');
            expect(result.color).toBeUndefined();
            expect(result.timeControlAlias).toBeUndefined();
            expect(result.roomType).toBe('self');
        });
    });
});

describe('JoinGameRoomRequestSchema', () => {
    describe('displayName default behavior', () => {
        it.each([
            {
                scenario: 'should use provided displayName',
                input: { displayName: 'Bob' },
                expected: 'Bob',
            },
            {
                scenario: 'should default to "Player 2" when displayName is undefined',
                input: { displayName: undefined },
                expected: 'Player 2',
            },
            {
                scenario: 'should default to "Player 2" when displayName is null',
                input: { displayName: null },
                expected: 'Player 2',
            },
            {
                scenario: 'should default to "Player 2" when displayName is empty string',
                input: { displayName: '' },
                expected: 'Player 2',
            },
            {
                scenario: 'should default to "Player 2" when displayName is not provided',
                input: {},
                expected: 'Player 2',
            },
        ])('$scenario', ({ input, expected }) => {
            const result = JoinGameRoomRequestSchema.parse(input);
            expect(result.displayName).toBe(expected);
        });
    });
});
