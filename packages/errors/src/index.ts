export class NotYetImplementedError extends Error {
    constructor() {
        super('This feature is not yet implemented');
        this.name = 'NotYetImplementedError';
        Object.setPrototypeOf(this, NotYetImplementedError.prototype);
    }
}

export class InvalidInputError extends Error {
    constructor(message: string) {
        super(`Invalid input: ${message}`);
        this.name = 'InvalidInputError';
        Object.setPrototypeOf(this, InvalidInputError.prototype);
    }
}

export class IllegalMoveError extends Error {
    constructor() {
        super('Illegal move attempted');
        this.name = 'IllegalMoveError';
        Object.setPrototypeOf(this, IllegalMoveError.prototype);
    }
}
