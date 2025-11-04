import { getTimeControlByAlias } from '@grouchess/game-room';
import {
    CreateGameRoomRequestSchema,
    CreateGameRoomResponseSchema,
    GetChessGameResponseSchema,
    JoinGameRoomRequestSchema,
    JoinGameRoomResponseSchema,
} from '@grouchess/http-schemas';
import { Router } from 'express';
import * as z from 'zod';

import { authenticateRequest } from '../middleware/authenticateRequest.js';
import { GameRoomIsFullError } from '../utils/errors.js';

export const roomRouter: Router = Router();

/**
 * Endpoint to get basic info about a game room.
 */
roomRouter.get('/:roomId', (req, res) => {
    const { roomId } = req.params;
    const { gameRoomService } = req.services;
    const room = gameRoomService.getGameRoomById(roomId);

    if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
    }

    res.json({
        roomId: room.id,
        timeControl: room.timeControl,
    });
});

/**
 * Endpoint to get chess game state for a game room.
 * Requires authentication via Bearer token.
 */
roomRouter.get('/:roomId/chess-game', authenticateRequest, (req, res) => {
    const { roomId } = req.params;
    const { chessGameService, gameRoomService, chessClockService, messageService } = req.services;

    const { playerId } = req;

    // Should be guaranteed by authenticateRequest middleware
    /* v8 ignore next -- @preserve */
    if (!playerId) {
        res.status(500).json({ error: 'Internal server error' });
        return;
    }

    const gameRoom = gameRoomService.getGameRoomById(roomId);
    if (!gameRoom) {
        res.status(404).json({ error: 'Game room not found' });
        return;
    }

    const chessGame = chessGameService.getChessGameForRoom(roomId);
    if (!chessGame) {
        res.status(404).json({ error: 'Chess game not found for this room' });
        return;
    }

    const clockState = chessClockService.getClockStateForRoom(roomId);
    const messages = messageService.getMessagesForRoom(roomId);

    const parsedResponse = GetChessGameResponseSchema.safeParse({
        gameRoom,
        chessGame,
        messages,
        clockState,
        playerId,
    });

    if (!parsedResponse.success) {
        console.error('Validation error getting chess game state:', parsedResponse.error.issues);
        res.status(500).json({ error: 'Internal server error' });
        return;
    }

    res.json(parsedResponse.data);
});

/**
 * Endpoint to create a new game room.
 * Returns the room ID, player ID, and authentication token for the creator.
 */
roomRouter.post('/', (req, res) => {
    const { playerService, gameRoomService, tokenService, messageService } = req.services;

    try {
        const { displayName, color, timeControlAlias, roomType } = CreateGameRoomRequestSchema.parse(req.body);

        const player = playerService.createPlayer(displayName);

        const { id: roomId } = gameRoomService.createGameRoom({
            timeControl: timeControlAlias ? getTimeControlByAlias(timeControlAlias) : null,
            roomType,
            creator: player,
            creatorColorInput: color,
        });
        messageService.initializeRoom(roomId);
        const token = tokenService.generate({ playerId: player.id, roomId });

        const parsedResponse = CreateGameRoomResponseSchema.safeParse({
            roomId,
            playerId: player.id,
            token,
        });

        if (!parsedResponse.success) {
            console.error('Validation error creating game room response:', parsedResponse.error.issues);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }

        res.json(parsedResponse.data);
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('Validation error creating game room request:', error.issues);
            res.status(400).json({ error: 'Invalid request data', details: error.issues });
            return;
        }
        console.error('Error creating game room:', error);
        res.status(500).json({ error: 'Failed to create game room' });
    }
});

/**
 * Endpoint to join an existing game room.
 * Returns the room ID, player ID, and authentication token for the joining player.
 */
roomRouter.post('/join/:roomId', (req, res) => {
    const { playerService, gameRoomService, tokenService } = req.services;
    const { roomId } = req.params;

    try {
        const { displayName } = JoinGameRoomRequestSchema.parse(req.body);

        const player = playerService.createPlayer(displayName);
        gameRoomService.joinGameRoom(roomId, player);
        const token = tokenService.generate({ playerId: player.id, roomId });

        const parsedResponse = JoinGameRoomResponseSchema.safeParse({
            roomId,
            playerId: player.id,
            token,
        });

        if (!parsedResponse.success) {
            console.error('Validation error joining game room response:', parsedResponse.error.issues);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }

        res.json(parsedResponse.data);
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('Validation error joining game room:', error.issues);
            res.status(400).json({ error: 'Invalid request data', details: error.issues });
            return;
        }
        if (error instanceof GameRoomIsFullError) {
            res.status(409).json({ error: 'Game room is full' });
            return;
        }
        console.error('Error joining game room:', error);
        res.status(500).json({ error: 'Failed to join game room' });
    }
});
