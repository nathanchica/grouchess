import type { ChessGameRoom, GameRoom, Player, TimeControl } from '@grouchess/models';

/**
 * Creates a mock Player
 * @param overrides - Partial overrides for the player
 * @returns A complete Player object
 *
 * @example
 * // Create default player
 * const player = createMockPlayer();
 *
 * @example
 * // Create player with custom name
 * const player = createMockPlayer({
 *   displayName: 'Alice',
 * });
 *
 * @example
 * // Create player with custom status
 * const player = createMockPlayer({
 *   id: 'player-123',
 *   displayName: 'Bob',
 *   status: 'away',
 * });
 */
export function createMockPlayer(overrides?: Partial<Player>): Player {
    return {
        id: 'player-1',
        displayName: 'Player',
        status: 'online',
        ...overrides,
    };
}

/**
 * Creates a mock TimeControl
 * @param overrides - Partial overrides for the time control
 * @returns A complete TimeControl object
 *
 * @example
 * // Create default time control (3|2 blitz)
 * const timeControl = createMockTimeControl();
 *
 * @example
 * // Create rapid time control (10|0)
 * const rapid = createMockTimeControl({
 *   alias: '10|0',
 *   minutes: 10,
 *   increment: 0,
 *   displayText: '10 min',
 * });
 *
 * @example
 * // Create bullet time control (1|0)
 * const bullet = createMockTimeControl({
 *   alias: '1|0',
 *   minutes: 1,
 *   increment: 0,
 *   displayText: '1 min',
 * });
 */
export function createMockTimeControl(overrides?: Partial<TimeControl>): TimeControl {
    return {
        alias: '3|2',
        minutes: 3,
        increment: 2,
        displayText: '3|2',
        ...overrides,
    };
}

/**
 * Creates a mock GameRoom
 * @param overrides - Partial overrides for the game room
 * @returns A complete GameRoom object
 *
 * @example
 * // Create default game room
 * const room = createMockGameRoom();
 *
 * @example
 * // Create game room with players
 * const room = createMockGameRoom({
 *   players: [
 *     createMockPlayer({ id: 'p1', displayName: 'Alice' }),
 *     createMockPlayer({ id: 'p2', displayName: 'Bob' }),
 *   ],
 *   playerIdToDisplayName: { p1: 'Alice', p2: 'Bob' },
 * });
 *
 * @example
 * // Create self-play room
 * const selfRoom = createMockGameRoom({
 *   type: 'self',
 *   players: [createMockPlayer()],
 * });
 */
export function createMockGameRoom(overrides?: Partial<GameRoom>): GameRoom {
    return {
        id: 'room-1',
        type: 'player-vs-player',
        players: [],
        playerIdToDisplayName: {},
        playerIdToScore: {},
        gameCount: 0,
        ...overrides,
    };
}

/**
 * Creates a mock ChessGameRoom
 * @param overrides - Partial overrides for the chess game room
 * @returns A complete ChessGameRoom object
 *
 * @example
 * // Create default chess game room
 * const room = createMockChessGameRoom();
 *
 * @example
 * // Create chess game room with time control
 * const room = createMockChessGameRoom({
 *   timeControl: createMockTimeControl({ alias: '10|0', minutes: 10, increment: 0 }),
 * });
 *
 * @example
 * // Create chess game room with players and color assignments
 * const room = createMockChessGameRoom({
 *   players: [
 *     createMockPlayer({ id: 'p1', displayName: 'Alice' }),
 *     createMockPlayer({ id: 'p2', displayName: 'Bob' }),
 *   ],
 *   colorToPlayerId: {
 *     white: 'p1',
 *     black: 'p2',
 *   },
 * });
 */
export function createMockChessGameRoom(overrides?: Partial<ChessGameRoom>): ChessGameRoom {
    return {
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
        ...overrides,
    };
}
