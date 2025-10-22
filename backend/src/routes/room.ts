import { Router } from 'express';
import * as z from 'zod';

import { getTimeControlByAlias, isValidTimeControlAlias } from '../data/timeControl.js';
import { RoomTypeEnum, PieceColorEnum, PlayerSchema } from '../utils/schemas.js';
import { generateGameRoomToken } from '../utils/token.js';

export const roomRouter: Router = Router();

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

const PlayerDisplayNameInput = PlayerSchema.shape.displayName.nullish();
const CreateGameRoomRequestSchema = z.object({
    displayName: PlayerDisplayNameInput.transform((val) => val || 'Player 1').describe(
        'The display name of the player creating the room. Defaults to "Player 1" if not provided.'
    ),
    color: PieceColorEnum.nullish().describe(
        'The preferred color for the creator. If not provided, a random color will be assigned.'
    ),
    timeControlAlias: z
        .string()
        .refine((alias) => isValidTimeControlAlias(alias), {
            error: 'Invalid time control alias',
        })
        .nullish()
        .describe(
            'The time control setting for the room. If not provided, there will be no time control (unlimited time).'
        ),
    roomType: RoomTypeEnum.describe('The type of room to create.'),
});

roomRouter.post('/', (req, res) => {
    const { playerService, gameRoomService } = req.services;

    try {
        const { displayName, color, timeControlAlias, roomType } = CreateGameRoomRequestSchema.parse(req.body);

        const player = playerService.createPlayer(displayName);

        const { id: roomId } = gameRoomService.createGameRoom({
            timeControl: timeControlAlias ? getTimeControlByAlias(timeControlAlias) : null,
            roomType,
            creator: player,
            creatorColorInput: color,
        });
        const token = generateGameRoomToken({ playerId: player.id, roomId });

        res.json({
            roomId,
            playerId: player.id,
            token,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('Validation error creating game room:', error.issues);
            res.status(400).json({ error: 'Invalid request data', details: error.issues });
            return;
        }
        console.error('Error creating game room:', error);
        res.status(500).json({ error: 'Failed to create game room' });
    }
});

roomRouter.post('/join/:roomId', (req, res) => {
    const { playerService, gameRoomService } = req.services;
    const { roomId } = req.params;

    try {
        const { displayName } = z
            .object({
                displayName: PlayerDisplayNameInput.transform((val) => val || 'Player 2').describe(
                    'The display name of the player joining the room. Defaults to "Player 2" if not provided.'
                ),
            })
            .parse(req.body);

        const player = playerService.createPlayer(displayName);
        gameRoomService.joinGameRoom(roomId, player);
        const token = generateGameRoomToken({ playerId: player.id, roomId });

        res.json({
            roomId,
            playerId: player.id,
            token,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('Validation error joining game room:', error.issues);
            res.status(400).json({ error: 'Invalid request data', details: error.issues });
            return;
        }
        if (error instanceof Error && error.cause === 'FULL') {
            res.status(403).json({ error: 'Game room is full' });
            return;
        }
        console.error('Error joining game room:', error);
        res.status(500).json({ error: 'Failed to join game room' });
    }
});
