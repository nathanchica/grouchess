export class GameRoomIsFullError extends Error {
    constructor() {
        super('Game room is full');
        this.name = 'GameRoomIsFullError';
    }
}

export class IllegalMoveError extends Error {
    constructor() {
        super('Illegal move attempted');
        this.name = 'IllegalMoveError';
    }
}

export class GameNotStartedError extends Error {
    constructor() {
        super('Game has not started yet');
        this.name = 'GameNotStartedError';
    }
}

export class NotYetImplementedError extends Error {
    constructor() {
        super('This feature is not yet implemented');
        this.name = 'NotYetImplementedError';
    }
}

export class InvalidInputError extends Error {
    constructor(message: string) {
        super(`Invalid input: ${message}`);
        this.name = 'InvalidInputError';
    }
}
