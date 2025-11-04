export class GameRoomIsFullError extends Error {
    constructor() {
        super('Game room is full');
        this.name = 'GameRoomIsFullError';
        Object.setPrototypeOf(this, GameRoomIsFullError.prototype);
    }
}

export class IllegalMoveError extends Error {
    constructor() {
        super('Illegal move attempted');
        this.name = 'IllegalMoveError';
        Object.setPrototypeOf(this, IllegalMoveError.prototype);
    }
}

export class GameNotStartedError extends Error {
    constructor() {
        super('Game has not started yet');
        this.name = 'GameNotStartedError';
        Object.setPrototypeOf(this, GameNotStartedError.prototype);
    }
}

export class UnauthorizedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UnauthorizedError';
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
}

export class InvalidChessGameStateError extends Error {
    constructor(message: string) {
        super(`Invalid chess game state: ${message}`);
        this.name = 'InvalidChessGameStateError';
        Object.setPrototypeOf(this, InvalidChessGameStateError.prototype);
    }
}
