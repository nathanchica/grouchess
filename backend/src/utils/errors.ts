export class GameRoomIsFullError extends Error {
    constructor() {
        super('Game room is full');
        this.name = 'GameRoomIsFullError';
    }
}
