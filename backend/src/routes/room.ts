import { Router } from 'express';

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

roomRouter.post('/', (req, res) => {
    const { displayName, color, timeControlAlias, roomType } = req.body;
    const { playerService, gameRoomService } = req.services;

    try {
        const player = playerService.createPlayer(displayName);
        const { id: roomId } = gameRoomService.createGameRoom(timeControlAlias, roomType, player, color);

        res.json({
            roomId,
            playerId: player.id,
        });
    } catch (error) {
        console.error('Error creating game room:', error);
        res.status(400).json({ error: 'Failed to create game room' });
    }
});
