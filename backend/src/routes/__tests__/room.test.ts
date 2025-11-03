import type { ChessGame } from '@grouchess/chess';
import type { ChessClockState } from '@grouchess/chess-clocks';
import type { ChessGameRoom, Player, TimeControl } from '@grouchess/game-room';
import request from 'supertest';
import * as z from 'zod';

import { createApp } from '../../app.js';
import {
    gameRoomService,
    chessGameService,
    chessClockService,
    tokenService,
    playerService,
} from '../../services/index.js';
import { GameRoomIsFullError } from '../../utils/errors.js';

const {
    getChessGameSafeParseMock,
    createGameRoomParseMock,
    createGameRoomResponseSafeParseMock,
    joinGameRoomParseMock,
    joinGameRoomResponseSafeParseMock,
} = vi.hoisted(() => ({
    getChessGameSafeParseMock: vi.fn(),
    createGameRoomParseMock: vi.fn(),
    createGameRoomResponseSafeParseMock: vi.fn(),
    joinGameRoomParseMock: vi.fn(),
    joinGameRoomResponseSafeParseMock: vi.fn(),
}));

vi.mock('@grouchess/http-schemas', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@grouchess/http-schemas')>();
    return {
        ...actual,
        GetChessGameResponseSchema: {
            safeParse: getChessGameSafeParseMock,
        },
        CreateGameRoomRequestSchema: {
            parse: createGameRoomParseMock,
        },
        CreateGameRoomResponseSchema: {
            safeParse: createGameRoomResponseSafeParseMock,
        },
        JoinGameRoomRequestSchema: {
            parse: joinGameRoomParseMock,
        },
        JoinGameRoomResponseSchema: {
            safeParse: joinGameRoomResponseSafeParseMock,
        },
    };
});

const ZodError = z.ZodError;

// Mock data factories
function createMockTimeControl(overrides?: Partial<TimeControl>): TimeControl {
    return {
        alias: '5|0',
        minutes: 5,
        increment: 0,
        displayText: '5 min',
        ...overrides,
    };
}

function createMockPlayer(overrides?: Partial<Player>): Player {
    return {
        id: 'player-123',
        displayName: 'Player 1',
        ...overrides,
    };
}

function createMockRoom(overrides?: Partial<ChessGameRoom>): ChessGameRoom {
    const player = createMockPlayer();
    return {
        id: 'room-456',
        timeControl: createMockTimeControl(),
        players: [player],
        playerIdToDisplayName: { [player.id]: player.displayName },
        playerIdToScore: { [player.id]: 0 },
        colorToPlayerId: { white: player.id, black: null },
        messages: [],
        gameCount: 1,
        type: 'player-vs-player' as const,
        ...overrides,
    };
}

function createMockChessGame(overrides?: Partial<ChessGame>): ChessGame {
    return {
        boardState: {
            board: Array(64).fill(null),
            playerTurn: 'white' as const,
            castleRightsByColor: {
                white: { short: true, long: true },
                black: { short: true, long: true },
            },
            enPassantTargetIndex: null,
            halfmoveClock: 0,
            fullmoveClock: 1,
        },
        gameState: {
            status: 'in-progress' as const,
        },
        legalMovesStore: {
            allMoves: [],
            byStartIndex: {},
            typeAndEndIndexToStartIndex: {},
        },
        moveHistory: [],
        captures: [],
        positionCounts: {},
        ...overrides,
    };
}

function createMockClockState(overrides?: Partial<ChessClockState>): ChessClockState {
    return {
        white: { timeRemainingMs: 300000, isActive: true },
        black: { timeRemainingMs: 300000, isActive: false },
        lastUpdatedTimeMs: Date.now(),
        baseTimeMs: 300000,
        incrementMs: 0,
        isPaused: false,
        ...overrides,
    };
}

describe('GET /room/:roomId', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns room info when room exists', async () => {
        const mockRoom = createMockRoom({ id: 'test-room-123' });

        vi.spyOn(gameRoomService, 'getGameRoomById').mockReturnValue(mockRoom);

        const response = await request(createApp()).get('/room/test-room-123');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            roomId: 'test-room-123',
            timeControl: mockRoom.timeControl,
        });
        expect(gameRoomService.getGameRoomById).toHaveBeenCalledWith('test-room-123');
    });

    it('returns 404 when room does not exist', async () => {
        vi.spyOn(gameRoomService, 'getGameRoomById').mockReturnValue(null);

        const response = await request(createApp()).get('/room/nonexistent-room');

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: 'Room not found' });
        expect(gameRoomService.getGameRoomById).toHaveBeenCalledWith('nonexistent-room');
    });

    it('returns room info with null timeControl when room has no time control', async () => {
        const mockRoom = createMockRoom({
            id: 'test-room-456',
            timeControl: null,
            players: [],
            playerIdToDisplayName: {},
            playerIdToScore: {},
            colorToPlayerId: { white: null, black: null },
            gameCount: 0,
        });

        vi.spyOn(gameRoomService, 'getGameRoomById').mockReturnValue(mockRoom);

        const response = await request(createApp()).get('/room/test-room-456');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            roomId: 'test-room-456',
            timeControl: null,
        });
    });
});

describe('GET /room/:roomId/chess-game', () => {
    const validToken = 'valid-jwt-token';
    const mockPlayerId = 'player-123';
    const mockRoomId = 'room-456';

    beforeEach(() => {
        // Default: make safeParse pass and return the input data
        getChessGameSafeParseMock.mockImplementation((data) => ({
            success: true,
            data,
        }));
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns chess game state when authenticated and all data exists', async () => {
        const mockRoom = createMockRoom({ id: mockRoomId });
        const mockChessGame = createMockChessGame();
        const mockClockState = createMockClockState();

        vi.spyOn(tokenService, 'verify').mockReturnValue({ playerId: mockPlayerId, roomId: mockRoomId });
        vi.spyOn(gameRoomService, 'getGameRoomById').mockReturnValue(mockRoom);
        vi.spyOn(chessGameService, 'getChessGameForRoom').mockReturnValue(mockChessGame);
        vi.spyOn(chessClockService, 'getClockStateForRoom').mockReturnValue(mockClockState);

        const response = await request(createApp())
            .get(`/room/${mockRoomId}/chess-game`)
            .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            gameRoom: expect.objectContaining({ id: mockRoomId }),
            chessGame: expect.objectContaining({
                boardState: expect.objectContaining({ playerTurn: 'white' }),
                gameState: mockChessGame.gameState,
            }),
            clockState: expect.objectContaining({ baseTimeMs: 300000 }),
            playerId: mockPlayerId,
        });
        expect(tokenService.verify).toHaveBeenCalledWith(validToken);
        expect(gameRoomService.getGameRoomById).toHaveBeenCalledWith(mockRoomId);
        expect(chessGameService.getChessGameForRoom).toHaveBeenCalledWith(mockRoomId);
        expect(chessClockService.getClockStateForRoom).toHaveBeenCalledWith(mockRoomId);
    });

    it('returns 401 when Authorization header is missing', async () => {
        const response = await request(createApp()).get(`/room/${mockRoomId}/chess-game`);

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ error: 'Authentication required' });
    });

    it('returns 401 when token is invalid', async () => {
        vi.spyOn(tokenService, 'verify').mockReturnValue(null);

        const response = await request(createApp())
            .get(`/room/${mockRoomId}/chess-game`)
            .set('Authorization', `Bearer invalid-token`);

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ error: 'Invalid or expired token' });
    });

    it('returns 403 when token is for a different room', async () => {
        vi.spyOn(tokenService, 'verify').mockReturnValue({ playerId: mockPlayerId, roomId: 'different-room' });

        const response = await request(createApp())
            .get(`/room/${mockRoomId}/chess-game`)
            .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: 'Token is not valid for this room' });
    });

    it('returns 404 when game room does not exist', async () => {
        vi.spyOn(tokenService, 'verify').mockReturnValue({ playerId: mockPlayerId, roomId: mockRoomId });
        vi.spyOn(gameRoomService, 'getGameRoomById').mockReturnValue(null);

        const response = await request(createApp())
            .get(`/room/${mockRoomId}/chess-game`)
            .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: 'Game room not found' });
    });

    it('returns 404 when chess game does not exist for the room', async () => {
        const mockRoom = createMockRoom({
            id: mockRoomId,
            timeControl: null,
            players: [],
            playerIdToDisplayName: {},
            playerIdToScore: {},
            colorToPlayerId: { white: null, black: null },
            gameCount: 0,
        });

        vi.spyOn(tokenService, 'verify').mockReturnValue({ playerId: mockPlayerId, roomId: mockRoomId });
        vi.spyOn(gameRoomService, 'getGameRoomById').mockReturnValue(mockRoom);
        vi.spyOn(chessGameService, 'getChessGameForRoom').mockReturnValue(undefined);

        const response = await request(createApp())
            .get(`/room/${mockRoomId}/chess-game`)
            .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: 'Chess game not found for this room' });
    });

    it('returns chess game state with null clock when no time control is set', async () => {
        const mockRoom = createMockRoom({ id: mockRoomId, timeControl: null });
        const mockChessGame = createMockChessGame();

        vi.spyOn(tokenService, 'verify').mockReturnValue({ playerId: mockPlayerId, roomId: mockRoomId });
        vi.spyOn(gameRoomService, 'getGameRoomById').mockReturnValue(mockRoom);
        vi.spyOn(chessGameService, 'getChessGameForRoom').mockReturnValue(mockChessGame);
        vi.spyOn(chessClockService, 'getClockStateForRoom').mockReturnValue(null);

        const response = await request(createApp())
            .get(`/room/${mockRoomId}/chess-game`)
            .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            gameRoom: expect.objectContaining({ id: mockRoomId }),
            chessGame: expect.objectContaining({
                boardState: expect.objectContaining({ playerTurn: 'white' }),
                gameState: mockChessGame.gameState,
            }),
            clockState: null,
            playerId: mockPlayerId,
        });
    });

    it('returns 500 when schema validation fails', async () => {
        const mockRoom = createMockRoom({ id: mockRoomId });
        const mockChessGame = createMockChessGame();
        const mockClockState = createMockClockState();

        const mockValidationError = {
            issues: [
                {
                    code: 'invalid_type',
                    expected: 'string',
                    received: 'number',
                    path: ['gameRoom', 'id'],
                    message: 'Expected string, received number',
                },
            ],
        };

        // Mock schema validation failure
        getChessGameSafeParseMock.mockReturnValue({
            success: false,
            error: mockValidationError,
        });

        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        vi.spyOn(tokenService, 'verify').mockReturnValue({ playerId: mockPlayerId, roomId: mockRoomId });
        vi.spyOn(gameRoomService, 'getGameRoomById').mockReturnValue(mockRoom);
        vi.spyOn(chessGameService, 'getChessGameForRoom').mockReturnValue(mockChessGame);
        vi.spyOn(chessClockService, 'getClockStateForRoom').mockReturnValue(mockClockState);

        const response = await request(createApp())
            .get(`/room/${mockRoomId}/chess-game`)
            .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'Internal server error' });
        expect(errorSpy).toHaveBeenCalledWith('Validation error getting chess game state:', mockValidationError.issues);
        expect(getChessGameSafeParseMock).toHaveBeenCalledWith({
            gameRoom: mockRoom,
            chessGame: mockChessGame,
            clockState: mockClockState,
            playerId: mockPlayerId,
        });
    });
});

describe('POST /room', () => {
    beforeEach(() => {
        // Default: make schema validation pass
        createGameRoomResponseSafeParseMock.mockImplementation((data) => ({
            success: true,
            data,
        }));
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('creates a new game room and returns room info with token', async () => {
        const requestBody = {
            displayName: 'Test Player',
            color: 'white',
            timeControlAlias: '5|0',
            roomType: 'player-vs-player',
        };

        const mockPlayer = createMockPlayer({ id: 'new-player-123', displayName: 'Test Player' });
        const mockRoom = createMockRoom({ id: 'new-room-456' });
        const mockToken = 'generated-token-abc';

        createGameRoomParseMock.mockReturnValue(requestBody);
        vi.spyOn(playerService, 'createPlayer').mockReturnValue(mockPlayer);
        vi.spyOn(gameRoomService, 'createGameRoom').mockReturnValue(mockRoom);
        vi.spyOn(tokenService, 'generate').mockReturnValue(mockToken);

        const response = await request(createApp()).post('/room').send(requestBody);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            roomId: 'new-room-456',
            playerId: 'new-player-123',
            token: mockToken,
        });
        expect(createGameRoomParseMock).toHaveBeenCalledWith(requestBody);
        expect(playerService.createPlayer).toHaveBeenCalledWith('Test Player');
        expect(gameRoomService.createGameRoom).toHaveBeenCalledWith({
            timeControl: expect.objectContaining({ alias: '5|0' }),
            roomType: 'player-vs-player',
            creator: mockPlayer,
            creatorColorInput: 'white',
        });
        expect(tokenService.generate).toHaveBeenCalledWith({
            playerId: 'new-player-123',
            roomId: 'new-room-456',
        });
    });

    it('creates a game room with null time control when no timeControlAlias provided', async () => {
        const requestBody = {
            displayName: 'Test Player',
            color: null,
            timeControlAlias: null,
            roomType: 'player-vs-player',
        };

        const mockPlayer = createMockPlayer({ id: 'new-player-123', displayName: 'Test Player' });
        const mockRoom = createMockRoom({ id: 'new-room-456', timeControl: null });
        const mockToken = 'generated-token-abc';

        createGameRoomParseMock.mockReturnValue(requestBody);
        vi.spyOn(playerService, 'createPlayer').mockReturnValue(mockPlayer);
        vi.spyOn(gameRoomService, 'createGameRoom').mockReturnValue(mockRoom);
        vi.spyOn(tokenService, 'generate').mockReturnValue(mockToken);

        const response = await request(createApp()).post('/room').send(requestBody);

        expect(response.status).toBe(200);
        expect(gameRoomService.createGameRoom).toHaveBeenCalledWith({
            timeControl: null,
            roomType: 'player-vs-player',
            creator: mockPlayer,
            creatorColorInput: null,
        });
    });

    it('returns 400 when request body fails Zod validation', async () => {
        const invalidBody = { invalid: 'data' };
        const mockIssues = [
            {
                code: 'invalid_type' as const,
                expected: 'string' as const,
                received: 'undefined' as const,
                path: ['displayName'],
                message: 'Required',
            },
        ];
        const zodError = new ZodError(mockIssues);

        createGameRoomParseMock.mockImplementation(() => {
            throw zodError;
        });

        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const response = await request(createApp()).post('/room').send(invalidBody);

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
            error: 'Invalid request data',
            details: expect.arrayContaining([
                expect.objectContaining({
                    code: 'invalid_type',
                    path: ['displayName'],
                }),
            ]),
        });
        expect(errorSpy).toHaveBeenCalledWith('Validation error creating game room request:', zodError.issues);
    });

    it('returns 500 when response schema validation fails', async () => {
        const requestBody = {
            displayName: 'Test Player',
            color: 'white',
            timeControlAlias: '5|0',
            roomType: 'player-vs-player',
        };

        const mockPlayer = createMockPlayer();
        const mockRoom = createMockRoom();
        const mockToken = 'generated-token';

        const mockValidationError = {
            issues: [
                {
                    code: 'invalid_type',
                    expected: 'string',
                    received: 'number',
                    path: ['roomId'],
                    message: 'Expected string, received number',
                },
            ],
        };

        createGameRoomParseMock.mockReturnValue(requestBody);
        vi.spyOn(playerService, 'createPlayer').mockReturnValue(mockPlayer);
        vi.spyOn(gameRoomService, 'createGameRoom').mockReturnValue(mockRoom);
        vi.spyOn(tokenService, 'generate').mockReturnValue(mockToken);

        createGameRoomResponseSafeParseMock.mockReturnValue({
            success: false,
            error: mockValidationError,
        });

        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const response = await request(createApp()).post('/room').send(requestBody);

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'Internal server error' });
        expect(errorSpy).toHaveBeenCalledWith(
            'Validation error creating game room response:',
            mockValidationError.issues
        );
    });

    it('returns 500 when an unexpected error occurs', async () => {
        const requestBody = {
            displayName: 'Test Player',
            color: 'white',
            timeControlAlias: '5|0',
            roomType: 'player-vs-player',
        };

        const unexpectedError = new Error('Database connection failed');

        createGameRoomParseMock.mockReturnValue(requestBody);
        vi.spyOn(playerService, 'createPlayer').mockImplementation(() => {
            throw unexpectedError;
        });

        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const response = await request(createApp()).post('/room').send(requestBody);

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'Failed to create game room' });
        expect(errorSpy).toHaveBeenCalledWith('Error creating game room:', unexpectedError);
    });
});

describe('POST /room/join/:roomId', () => {
    const mockRoomId = 'room-to-join-123';

    beforeEach(() => {
        // Default: make schema validation pass
        joinGameRoomParseMock.mockImplementation((data) => data);
        joinGameRoomResponseSafeParseMock.mockImplementation((data) => ({
            success: true,
            data,
        }));
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('joins an existing game room and returns room info with token', async () => {
        const requestBody = {
            displayName: 'Player 2',
        };

        const mockPlayer = createMockPlayer({ id: 'joining-player-456', displayName: 'Player 2' });
        const mockToken = 'join-token-xyz';

        joinGameRoomParseMock.mockReturnValue({ displayName: 'Player 2' });
        vi.spyOn(playerService, 'createPlayer').mockReturnValue(mockPlayer);
        vi.spyOn(gameRoomService, 'joinGameRoom').mockReturnValue(undefined);
        vi.spyOn(tokenService, 'generate').mockReturnValue(mockToken);

        const response = await request(createApp()).post(`/room/join/${mockRoomId}`).send(requestBody);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            roomId: mockRoomId,
            playerId: 'joining-player-456',
            token: mockToken,
        });
        expect(joinGameRoomParseMock).toHaveBeenCalledWith(requestBody);
        expect(playerService.createPlayer).toHaveBeenCalledWith('Player 2');
        expect(gameRoomService.joinGameRoom).toHaveBeenCalledWith(mockRoomId, mockPlayer);
        expect(tokenService.generate).toHaveBeenCalledWith({
            playerId: 'joining-player-456',
            roomId: mockRoomId,
        });
    });

    it('joins with default displayName "Player 2" when not provided', async () => {
        const requestBody = {};

        const mockPlayer = createMockPlayer({ id: 'joining-player-789', displayName: 'Player 2' });
        const mockToken = 'join-token-default';

        joinGameRoomParseMock.mockReturnValue({ displayName: 'Player 2' });
        vi.spyOn(playerService, 'createPlayer').mockReturnValue(mockPlayer);
        vi.spyOn(gameRoomService, 'joinGameRoom').mockReturnValue(undefined);
        vi.spyOn(tokenService, 'generate').mockReturnValue(mockToken);

        const response = await request(createApp()).post(`/room/join/${mockRoomId}`).send(requestBody);

        expect(response.status).toBe(200);
        expect(joinGameRoomParseMock).toHaveBeenCalledWith(requestBody);
        expect(playerService.createPlayer).toHaveBeenCalledWith('Player 2');
    });

    it('returns 400 when request body fails Zod validation', async () => {
        const invalidBody = { displayName: 123 }; // Invalid type
        const mockIssues = [
            {
                code: 'invalid_type' as const,
                expected: 'string' as const,
                path: ['displayName'],
                message: 'Invalid input: expected string, received number',
            },
        ];
        const zodError = new ZodError(mockIssues);

        joinGameRoomParseMock.mockImplementation(() => {
            throw zodError;
        });

        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const response = await request(createApp()).post(`/room/join/${mockRoomId}`).send(invalidBody);

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
            error: 'Invalid request data',
        });
        expect(errorSpy).toHaveBeenCalledWith(
            'Validation error joining game room:',
            expect.arrayContaining([
                expect.objectContaining({
                    code: 'invalid_type',
                    path: ['displayName'],
                }),
            ])
        );
        expect(joinGameRoomParseMock).toHaveBeenCalledWith(invalidBody);
    });

    it('returns 409 when game room is full', async () => {
        const requestBody = { displayName: 'Player 3' };
        const mockPlayer = createMockPlayer({ id: 'player-3', displayName: 'Player 3' });

        vi.spyOn(playerService, 'createPlayer').mockReturnValue(mockPlayer);
        vi.spyOn(gameRoomService, 'joinGameRoom').mockImplementation(() => {
            throw new GameRoomIsFullError();
        });

        const response = await request(createApp()).post(`/room/join/${mockRoomId}`).send(requestBody);

        expect(response.status).toBe(409);
        expect(response.body).toEqual({ error: 'Game room is full' });
    });

    it('returns 500 when response schema validation fails', async () => {
        const requestBody = { displayName: 'Player 2' };
        const mockPlayer = createMockPlayer({ id: 'player-2', displayName: 'Player 2' });
        const mockToken = 'token';

        const mockValidationError = {
            issues: [
                {
                    code: 'invalid_type',
                    expected: 'string',
                    received: 'number',
                    path: ['playerId'],
                    message: 'Expected string, received number',
                },
            ],
        };

        vi.spyOn(playerService, 'createPlayer').mockReturnValue(mockPlayer);
        vi.spyOn(gameRoomService, 'joinGameRoom').mockReturnValue(undefined);
        vi.spyOn(tokenService, 'generate').mockReturnValue(mockToken);

        joinGameRoomResponseSafeParseMock.mockReturnValue({
            success: false,
            error: mockValidationError,
        });

        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const response = await request(createApp()).post(`/room/join/${mockRoomId}`).send(requestBody);

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'Internal server error' });
        expect(errorSpy).toHaveBeenCalledWith(
            'Validation error joining game room response:',
            mockValidationError.issues
        );
    });

    it('returns 500 when an unexpected error occurs', async () => {
        const requestBody = { displayName: 'Player 2' };
        const unexpectedError = new Error('Network failure');

        vi.spyOn(playerService, 'createPlayer').mockImplementation(() => {
            throw unexpectedError;
        });

        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const response = await request(createApp()).post(`/room/join/${mockRoomId}`).send(requestBody);

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'Failed to join game room' });
        expect(errorSpy).toHaveBeenCalledWith('Error joining game room:', unexpectedError);
    });
});
