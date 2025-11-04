import type { ChessGameRoom, Message, Player } from '@grouchess/models';
import { createMockPlayer, createMockTimeControl, createMockChessGameState } from '@grouchess/test-utils';

import { GameRoomIsFullError, UnauthorizedError } from '../../utils/errors.js';
import { GameRoomService } from '../gameRoomService.js';

describe('GameRoomService.createGameRoom', () => {
    it('creates a new game room with generated ID and default values', () => {
        const service = new GameRoomService();
        const creator = createMockPlayer({ id: 'p1', displayName: 'Alice' });
        const timeControl = createMockTimeControl();

        const room = service.createGameRoom({
            timeControl,
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: 'white',
        });

        expect(room.id).toBeDefined();
        expect(room.timeControl).toEqual(timeControl);
        expect(room.players).toEqual([creator]);
        expect(room.playerIdToDisplayName).toEqual({ p1: 'Alice' });
        expect(room.playerIdToScore).toEqual({ p1: 0 });
        expect(room.colorToPlayerId).toEqual({ white: 'p1', black: null });
        expect(room.messages).toEqual([]);
        expect(room.gameCount).toBe(0);
        expect(room.type).toBe('player-vs-player');

        const offers = service.getOffersForGameRoom(room.id);
        expect(offers).toEqual({ 'draw-offer': null, 'rematch-offer': null });
    });

    it.each([
        {
            scenario: 'creatorColorInput is white',
            creatorColorInput: 'white' as const,
            expectedWhite: 'p1',
            expectedBlack: null,
        },
        {
            scenario: 'creatorColorInput is black',
            creatorColorInput: 'black' as const,
            expectedWhite: null,
            expectedBlack: 'p1',
        },
    ])('assigns creator to $scenario', ({ creatorColorInput, expectedWhite, expectedBlack }) => {
        const service = new GameRoomService();
        const creator = createMockPlayer({ id: 'p1' });

        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator,
            creatorColorInput,
        });

        expect(room.colorToPlayerId.white).toBe(expectedWhite);
        expect(room.colorToPlayerId.black).toBe(expectedBlack);
    });

    it('assigns random color when creatorColorInput is not provided', () => {
        const service = new GameRoomService();
        const creator = createMockPlayer({ id: 'p1' });
        const spy = vi.spyOn(Math, 'random');

        // Test both branches
        spy.mockReturnValueOnce(0.3); // < 0.5 => white
        const room1 = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: undefined,
        });
        expect(room1.colorToPlayerId.white).toBe('p1');
        expect(room1.colorToPlayerId.black).toBeNull();

        spy.mockReturnValueOnce(0.7); // >= 0.5 => black
        const room2 = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: undefined,
        });
        expect(room2.colorToPlayerId.white).toBeNull();
        expect(room2.colorToPlayerId.black).toBe('p1');

        spy.mockRestore();
    });
});

describe('GameRoomService.getGameRoomById', () => {
    it('returns the game room when it exists', () => {
        const service = new GameRoomService();
        const creator = createMockPlayer({ id: 'p1', displayName: 'Alice' });
        const timeControl = createMockTimeControl();

        const created = service.createGameRoom({
            timeControl,
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: 'white',
        });

        const retrieved = service.getGameRoomById(created.id);

        expect(retrieved).toEqual(created);
    });

    it('returns null when game room does not exist', () => {
        const service = new GameRoomService();

        const result = service.getGameRoomById('non-existent-id');

        expect(result).toBeNull();
    });

    it('returns a clone of the game room', () => {
        const service = new GameRoomService();
        const creator = createMockPlayer();
        const created = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: 'white',
        });

        const retrieved = service.getGameRoomById(created.id);
        retrieved!.gameCount = 999;

        const retrievedAgain = service.getGameRoomById(created.id);
        expect(retrievedAgain!.gameCount).toBe(0);
    });
});

describe('GameRoomService.getOffersForGameRoom', () => {
    it('returns the offers when they exist', () => {
        const service = new GameRoomService();
        const creator = createMockPlayer();
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: 'white',
        });

        const offers = service.getOffersForGameRoom(room.id);

        expect(offers).toEqual({ 'draw-offer': null, 'rematch-offer': null });
    });

    it('returns null when offers do not exist', () => {
        const service = new GameRoomService();

        const result = service.getOffersForGameRoom('non-existent-id');

        expect(result).toBeNull();
    });

    it('returns a clone of the offers', () => {
        const service = new GameRoomService();
        const creator = createMockPlayer();
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: 'white',
        });

        const offers = service.getOffersForGameRoom(room.id);
        offers!['draw-offer'] = { id: 'msg-1' } as Message;

        const offersAgain = service.getOffersForGameRoom(room.id);
        expect(offersAgain!['draw-offer']).toBeNull();
    });
});

describe('GameRoomService.getPlayerColor', () => {
    it('returns white when player is assigned to white', () => {
        const service = new GameRoomService();
        const creator = createMockPlayer({ id: 'p1' });
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: 'white',
        });

        const color = service.getPlayerColor(room.id, 'p1');

        expect(color).toBe('white');
    });

    it('returns black when player is assigned to black', () => {
        const service = new GameRoomService();
        const creator = createMockPlayer({ id: 'p1' });
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: 'black',
        });

        const color = service.getPlayerColor(room.id, 'p1');

        expect(color).toBe('black');
    });

    it('throws error when player is not in the game room', () => {
        const service = new GameRoomService();
        const creator = createMockPlayer({ id: 'p1' });
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: 'white',
        });

        expect(() => service.getPlayerColor(room.id, 'p-unknown')).toThrow('Player not found in game room');
    });

    it('throws error when game room does not exist', () => {
        const service = new GameRoomService();

        expect(() => service.getPlayerColor('non-existent-id', 'p1')).toThrow('Game room not found');
    });
});

describe('GameRoomService.addMessageToGameRoom', () => {
    it('adds a standard message to the game room', () => {
        const service = new GameRoomService();
        const creator = createMockPlayer({ id: 'p1', displayName: 'Alice' });
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: 'white',
        });

        const message = service.addMessageToGameRoom(room.id, 'standard', 'p1', 'Hello world!');

        expect(message.id).toBeDefined();
        expect(message.type).toBe('standard');
        expect(message.authorId).toBe('p1');
        expect(message.content).toBe('Hello world!');
        expect(message.createdAt).toBeInstanceOf(Date);

        const updatedRoom = service.getGameRoomById(room.id);
        expect(updatedRoom!.messages).toHaveLength(1);
        expect(updatedRoom!.messages[0]).toEqual(message);
    });

    it.each([
        {
            scenario: 'draw-offer messages',
            messageType: 'draw-offer' as const,
            displayName: 'Alice',
            expectedContent: 'Alice is offering a draw...',
        },
        {
            scenario: 'rematch-offer messages',
            messageType: 'rematch-offer' as const,
            displayName: 'Bob',
            expectedContent: 'Bob is offering a rematch...',
        },
        {
            scenario: 'player-left-room messages',
            messageType: 'player-left-room' as const,
            displayName: 'Charlie',
            expectedContent: 'Charlie has left the room.',
        },
        {
            scenario: 'player-rejoined-room messages',
            messageType: 'player-rejoined-room' as const,
            displayName: 'Dave',
            expectedContent: 'Dave has rejoined the room.',
        },
    ])('auto-generates content for $scenario', ({ messageType, displayName, expectedContent }) => {
        const service = new GameRoomService();
        const creator = createMockPlayer({ id: 'p1', displayName });
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: 'white',
        });

        const message = service.addMessageToGameRoom(room.id, messageType, 'p1');

        expect(message.content).toBe(expectedContent);
    });

    it('enforces MAX_MESSAGES_PER_ROOM limit', () => {
        const service = new GameRoomService();
        const creator = createMockPlayer({ id: 'p1' });
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: 'white',
        });

        // Add 102 messages (MAX_MESSAGES_PER_ROOM is 100)
        const messages: Message[] = [];
        for (let i = 0; i < 102; i++) {
            messages.push(service.addMessageToGameRoom(room.id, 'standard', 'p1', `Message ${i}`));
        }

        const updatedRoom = service.getGameRoomById(room.id);
        expect(updatedRoom!.messages).toHaveLength(100);
        // First two messages should be removed
        expect(updatedRoom!.messages[0].id).toBe(messages[2].id);
        expect(updatedRoom!.messages[99].id).toBe(messages[101].id);
    });

    it.each([
        { scenario: 'draw-offer', offerType: 'draw-offer' as const },
        { scenario: 'rematch-offer', offerType: 'rematch-offer' as const },
    ])('tracks $scenario messages in offers', ({ offerType }) => {
        const service = new GameRoomService();
        const creator = createMockPlayer({ id: 'p1' });
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: 'white',
        });

        const message = service.addMessageToGameRoom(room.id, offerType, 'p1');

        const offers = service.getOffersForGameRoom(room.id);
        expect(offers![offerType]).toEqual(message);
    });

    it.each([
        { scenario: 'draw-offer', offerType: 'draw-offer' as const },
        { scenario: 'rematch-offer', offerType: 'rematch-offer' as const },
    ])('throws error when adding duplicate $scenario', ({ offerType }) => {
        const service = new GameRoomService();
        const creator = createMockPlayer({ id: 'p1' });
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: 'white',
        });

        service.addMessageToGameRoom(room.id, offerType, 'p1');

        expect(() => service.addMessageToGameRoom(room.id, offerType, 'p1')).toThrow(
            `There is already an active ${offerType}`
        );
    });

    it('throws error when game room does not exist', () => {
        const service = new GameRoomService();

        expect(() => service.addMessageToGameRoom('non-existent-id', 'standard', 'p1', 'Hello')).toThrow(
            'Game room not found'
        );
    });

    it.each([
        { scenario: 'draw-accept', messageType: 'draw-accept' as const },
        { scenario: 'draw-decline', messageType: 'draw-decline' as const },
        { scenario: 'rematch-accept', messageType: 'rematch-accept' as const },
        { scenario: 'rematch-decline', messageType: 'rematch-decline' as const },
    ])('throws error when directly adding $scenario offer response message', ({ messageType }) => {
        const service = new GameRoomService();
        const creator = createMockPlayer({ id: 'p1' });
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: 'white',
        });

        expect(() => service.addMessageToGameRoom(room.id, messageType, 'p1')).toThrow(
            'Cannot directly add an offer response message. Must use respondToOffer method.'
        );
    });
});

describe('GameRoomService.joinGameRoom', () => {
    it('adds a new player to the game room', () => {
        const service = new GameRoomService();
        const creator = createMockPlayer({ id: 'p1', displayName: 'Alice' });
        const joiner = createMockPlayer({ id: 'p2', displayName: 'Bob' });
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: 'white',
        });

        service.joinGameRoom(room.id, joiner);

        const updatedRoom = service.getGameRoomById(room.id);
        expect(updatedRoom!.players).toHaveLength(2);
        expect(updatedRoom!.players[1]).toEqual(joiner);
        expect(updatedRoom!.playerIdToDisplayName).toEqual({ p1: 'Alice', p2: 'Bob' });
        expect(updatedRoom!.playerIdToScore).toEqual({ p1: 0, p2: 0 });
        expect(updatedRoom!.colorToPlayerId).toEqual({ white: 'p1', black: 'p2' });
    });

    it('assigns player to black when white is taken', () => {
        const service = new GameRoomService();
        const creator = createMockPlayer({ id: 'p1' });
        const joiner = createMockPlayer({ id: 'p2' });
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: 'white',
        });

        service.joinGameRoom(room.id, joiner);

        const updatedRoom = service.getGameRoomById(room.id);
        expect(updatedRoom!.colorToPlayerId.black).toBe('p2');
    });

    it('assigns player to white when black is taken', () => {
        const service = new GameRoomService();
        const creator = createMockPlayer({ id: 'p1' });
        const joiner = createMockPlayer({ id: 'p2' });
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: 'black',
        });

        service.joinGameRoom(room.id, joiner);

        const updatedRoom = service.getGameRoomById(room.id);
        expect(updatedRoom!.colorToPlayerId.white).toBe('p2');
    });

    it('does nothing when player is already in the room', () => {
        const service = new GameRoomService();
        const creator = createMockPlayer({ id: 'p1', displayName: 'Alice' });
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: 'white',
        });

        service.joinGameRoom(room.id, creator);

        const updatedRoom = service.getGameRoomById(room.id);
        expect(updatedRoom!.players).toHaveLength(1);
    });

    it('throws GameRoomIsFullError when room has 2 players', () => {
        const service = new GameRoomService();
        const player1 = createMockPlayer({ id: 'p1' });
        const player2 = createMockPlayer({ id: 'p2' });
        const player3 = createMockPlayer({ id: 'p3' });
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator: player1,
            creatorColorInput: 'white',
        });
        service.joinGameRoom(room.id, player2);

        expect(() => service.joinGameRoom(room.id, player3)).toThrow(GameRoomIsFullError);
    });

    it('throws error when game room does not exist', () => {
        const service = new GameRoomService();
        const player = createMockPlayer();

        expect(() => service.joinGameRoom('non-existent-id', player)).toThrow('Game room not found');
    });
});

describe('GameRoomService.startNewGameInRoom', () => {
    it('increments game count', () => {
        const service = new GameRoomService();
        const creator = createMockPlayer({ id: 'p1' });
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: 'white',
        });

        service.startNewGameInRoom(room.id);

        const updatedRoom = service.getGameRoomById(room.id);
        expect(updatedRoom!.gameCount).toBe(1);
    });

    it('resets offers to initial state', () => {
        const service = new GameRoomService();
        const creator = createMockPlayer({ id: 'p1' });
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: 'white',
        });

        // Add offers
        service.addMessageToGameRoom(room.id, 'draw-offer', 'p1');
        service.addMessageToGameRoom(room.id, 'rematch-offer', 'p1');

        service.startNewGameInRoom(room.id);

        const offers = service.getOffersForGameRoom(room.id);
        expect(offers).toEqual({ 'draw-offer': null, 'rematch-offer': null });
    });

    it('throws error when game room does not exist', () => {
        const service = new GameRoomService();

        expect(() => service.startNewGameInRoom('non-existent-id')).toThrow('Game room not found');
    });
});

describe('GameRoomService.incrementPlayerScore', () => {
    it('increments player score by 1 for a win', () => {
        const service = new GameRoomService();
        const creator = createMockPlayer({ id: 'p1' });
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: 'white',
        });

        const updatedRoom = service.incrementPlayerScore(room.id, 'p1', false);

        expect(updatedRoom.playerIdToScore.p1).toBe(1);
    });

    it('increments player score by 0.5 for a draw', () => {
        const service = new GameRoomService();
        const creator = createMockPlayer({ id: 'p1' });
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: 'white',
        });

        const updatedRoom = service.incrementPlayerScore(room.id, 'p1', true);

        expect(updatedRoom.playerIdToScore.p1).toBe(0.5);
    });

    it('accumulates multiple score increments', () => {
        const service = new GameRoomService();
        const creator = createMockPlayer({ id: 'p1' });
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: 'white',
        });

        service.incrementPlayerScore(room.id, 'p1', false); // +1
        service.incrementPlayerScore(room.id, 'p1', true); // +0.5
        const updatedRoom = service.incrementPlayerScore(room.id, 'p1', false); // +1

        expect(updatedRoom.playerIdToScore.p1).toBe(2.5);
    });

    it('throws error when player is not in the game room', () => {
        const service = new GameRoomService();
        const creator = createMockPlayer({ id: 'p1' });
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: 'white',
        });

        expect(() => service.incrementPlayerScore(room.id, 'p-unknown', false)).toThrow(
            'Player not found in game room'
        );
    });

    it('throws error when game room does not exist', () => {
        const service = new GameRoomService();

        expect(() => service.incrementPlayerScore('non-existent-id', 'p1', false)).toThrow('Game room not found');
    });
});

describe('GameRoomService.updatePlayerScores', () => {
    it('increments winner score when there is a winner', () => {
        const service = new GameRoomService();
        const p1 = createMockPlayer({ id: 'p1' });
        const p2 = createMockPlayer({ id: 'p2' });
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator: p1,
            creatorColorInput: 'white',
        });
        service.joinGameRoom(room.id, p2);

        const gameState = createMockChessGameState({ winner: 'white', status: 'checkmate' });
        const scores = service.updatePlayerScores(room.id, gameState);

        expect(scores.p1).toBe(1);
        expect(scores.p2).toBe(0);
    });

    it.each([
        { scenario: 'stalemate', status: 'stalemate' as const },
        { scenario: 'insufficient material', status: 'insufficient-material' as const },
        { scenario: 'threefold repetition', status: 'threefold-repetition' as const },
        { scenario: 'fifty-move rule', status: '50-move-draw' as const },
    ])('increments both players by 0.5 for a draw by $scenario', ({ status }) => {
        const service = new GameRoomService();
        const p1 = createMockPlayer({ id: 'p1' });
        const p2 = createMockPlayer({ id: 'p2' });
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator: p1,
            creatorColorInput: 'white',
        });
        service.joinGameRoom(room.id, p2);

        const gameState = createMockChessGameState({ status });
        const scores = service.updatePlayerScores(room.id, gameState);

        expect(scores.p1).toBe(0.5);
        expect(scores.p2).toBe(0.5);
    });

    it('does not update scores when game is in progress', () => {
        const service = new GameRoomService();
        const p1 = createMockPlayer({ id: 'p1' });
        const p2 = createMockPlayer({ id: 'p2' });
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator: p1,
            creatorColorInput: 'white',
        });
        service.joinGameRoom(room.id, p2);

        const gameState = createMockChessGameState({ status: 'in-progress' });
        const scores = service.updatePlayerScores(room.id, gameState);

        expect(scores.p1).toBe(0);
        expect(scores.p2).toBe(0);
    });

    it('throws error when winner has no player ID assigned', () => {
        const service = new GameRoomService();
        const creator = createMockPlayer({ id: 'p1' });
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: 'white',
        });

        const gameState = createMockChessGameState({ winner: 'black', status: 'checkmate' });

        expect(() => service.updatePlayerScores(room.id, gameState)).toThrow(
            'Expected winner to have a valid player ID'
        );
    });

    it('throws error when game room does not exist', () => {
        const service = new GameRoomService();
        const gameState = createMockChessGameState();

        expect(() => service.updatePlayerScores('non-existent-id', gameState)).toThrow('Game room not found');
    });
});

describe('GameRoomService.swapPlayerColors', () => {
    it('swaps white and black player assignments', () => {
        const service = new GameRoomService();
        const player1 = createMockPlayer({ id: 'p1' });
        const player2 = createMockPlayer({ id: 'p2' });
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator: player1,
            creatorColorInput: 'white',
        });
        service.joinGameRoom(room.id, player2);

        service.swapPlayerColors(room.id);

        const updatedRoom = service.getGameRoomById(room.id);
        expect(updatedRoom!.colorToPlayerId.white).toBe('p2');
        expect(updatedRoom!.colorToPlayerId.black).toBe('p1');
    });

    it('can swap colors multiple times', () => {
        const service = new GameRoomService();
        const player1 = createMockPlayer({ id: 'p1' });
        const player2 = createMockPlayer({ id: 'p2' });
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator: player1,
            creatorColorInput: 'white',
        });
        service.joinGameRoom(room.id, player2);

        service.swapPlayerColors(room.id);
        service.swapPlayerColors(room.id);

        const updatedRoom = service.getGameRoomById(room.id);
        expect(updatedRoom!.colorToPlayerId.white).toBe('p1');
        expect(updatedRoom!.colorToPlayerId.black).toBe('p2');
    });

    it('throws error when game room does not exist', () => {
        const service = new GameRoomService();

        expect(() => service.swapPlayerColors('non-existent-id')).toThrow('Game room not found');
    });
});

describe('GameRoomService.acceptDraw', () => {
    let service: GameRoomService;
    let room: ChessGameRoom;
    let player1: Player;
    let player2: Player;

    beforeEach(() => {
        service = new GameRoomService();
        player1 = createMockPlayer({ id: 'p1', displayName: 'Alice' });
        player2 = createMockPlayer({ id: 'p2', displayName: 'Bob' });
        room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator: player1,
            creatorColorInput: 'white',
        });
        service.joinGameRoom(room.id, player2);
    });

    it('converts draw-offer to draw-accept and returns the updated message', () => {
        service.addMessageToGameRoom(room.id, 'draw-offer', 'p1');

        const updatedMessage = service.acceptDraw(room.id, 'p2');

        expect(updatedMessage.type).toBe('draw-accept');
        expect(updatedMessage.content).toBe('Draw accepted.');
        expect(updatedMessage.authorId).toBe('p1'); // Original author
    });

    it('updates the message in the game room', () => {
        service.addMessageToGameRoom(room.id, 'draw-offer', 'p1');

        service.acceptDraw(room.id, 'p2');

        const updatedRoom = service.getGameRoomById(room.id);
        expect(updatedRoom!.messages).toHaveLength(1);
        expect(updatedRoom!.messages[0].type).toBe('draw-accept');
    });

    it('clears the draw offer from offers tracking', () => {
        service.addMessageToGameRoom(room.id, 'draw-offer', 'p1');

        service.acceptDraw(room.id, 'p2');

        const offers = service.getOffersForGameRoom(room.id);
        expect(offers!['draw-offer']).toBeNull();
    });

    it('throws UnauthorizedError when player responds to their own offer', () => {
        service.addMessageToGameRoom(room.id, 'draw-offer', 'p1');

        expect(() => service.acceptDraw(room.id, 'p1')).toThrow(UnauthorizedError);
        expect(() => service.acceptDraw(room.id, 'p1')).toThrow('Player cannot respond to their own offer');
    });

    it('throws error when no active draw offer exists', () => {
        expect(() => service.acceptDraw(room.id, 'p2')).toThrow('No active offer to respond to');
    });

    it('throws error when game room does not exist', () => {
        expect(() => service.acceptDraw('non-existent-id', 'p2')).toThrow('Game room not found');
    });
});

describe('GameRoomService.declineDraw', () => {
    let service: GameRoomService;
    let room: ChessGameRoom;
    let player1: Player;
    let player2: Player;

    beforeEach(() => {
        service = new GameRoomService();
        player1 = createMockPlayer({ id: 'p1', displayName: 'Alice' });
        player2 = createMockPlayer({ id: 'p2', displayName: 'Bob' });
        room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator: player1,
            creatorColorInput: 'white',
        });
        service.joinGameRoom(room.id, player2);
    });

    it('converts draw-offer to draw-decline and returns the updated message', () => {
        service.addMessageToGameRoom(room.id, 'draw-offer', 'p1');

        const updatedMessage = service.declineDraw(room.id, 'p2');

        expect(updatedMessage.type).toBe('draw-decline');
        expect(updatedMessage.content).toBe('Draw declined.');
        expect(updatedMessage.authorId).toBe('p1'); // Original author
    });

    it('updates the message in the game room', () => {
        service.addMessageToGameRoom(room.id, 'draw-offer', 'p1');

        service.declineDraw(room.id, 'p2');

        const updatedRoom = service.getGameRoomById(room.id);
        expect(updatedRoom!.messages).toHaveLength(1);
        expect(updatedRoom!.messages[0].type).toBe('draw-decline');
    });

    it('clears the draw offer from offers tracking', () => {
        service.addMessageToGameRoom(room.id, 'draw-offer', 'p1');

        service.declineDraw(room.id, 'p2');

        const offers = service.getOffersForGameRoom(room.id);
        expect(offers!['draw-offer']).toBeNull();
    });

    it('throws UnauthorizedError when player responds to their own offer', () => {
        service.addMessageToGameRoom(room.id, 'draw-offer', 'p1');

        expect(() => service.declineDraw(room.id, 'p1')).toThrow(UnauthorizedError);
        expect(() => service.declineDraw(room.id, 'p1')).toThrow('Player cannot respond to their own offer');
    });

    it('throws error when no active draw offer exists', () => {
        expect(() => service.declineDraw(room.id, 'p2')).toThrow('No active offer to respond to');
    });

    it('throws error when game room does not exist', () => {
        expect(() => service.declineDraw('non-existent-id', 'p2')).toThrow('Game room not found');
    });
});

describe('GameRoomService.acceptRematch', () => {
    let service: GameRoomService;
    let room: ChessGameRoom;
    let player1: Player;
    let player2: Player;

    beforeEach(() => {
        service = new GameRoomService();
        player1 = createMockPlayer({ id: 'p1', displayName: 'Alice' });
        player2 = createMockPlayer({ id: 'p2', displayName: 'Bob' });
        room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator: player1,
            creatorColorInput: 'white',
        });
        service.joinGameRoom(room.id, player2);
    });

    it('converts rematch-offer to rematch-accept and returns the updated message', () => {
        service.addMessageToGameRoom(room.id, 'rematch-offer', 'p1');

        const updatedMessage = service.acceptRematch(room.id, 'p2');

        expect(updatedMessage.type).toBe('rematch-accept');
        expect(updatedMessage.content).toBe('Rematch accepted.');
        expect(updatedMessage.authorId).toBe('p1'); // Original author
    });

    it('updates the message in the game room', () => {
        service.addMessageToGameRoom(room.id, 'rematch-offer', 'p1');

        service.acceptRematch(room.id, 'p2');

        const updatedRoom = service.getGameRoomById(room.id);
        expect(updatedRoom!.messages).toHaveLength(1);
        expect(updatedRoom!.messages[0].type).toBe('rematch-accept');
    });

    it('clears the rematch offer from offers tracking', () => {
        service.addMessageToGameRoom(room.id, 'rematch-offer', 'p1');

        service.acceptRematch(room.id, 'p2');

        const offers = service.getOffersForGameRoom(room.id);
        expect(offers!['rematch-offer']).toBeNull();
    });

    it('throws UnauthorizedError when player responds to their own offer', () => {
        service.addMessageToGameRoom(room.id, 'rematch-offer', 'p1');

        expect(() => service.acceptRematch(room.id, 'p1')).toThrow(UnauthorizedError);
        expect(() => service.acceptRematch(room.id, 'p1')).toThrow('Player cannot respond to their own offer');
    });

    it('throws error when no active rematch offer exists', () => {
        expect(() => service.acceptRematch(room.id, 'p2')).toThrow('No active offer to respond to');
    });

    it('throws error when game room does not exist', () => {
        expect(() => service.acceptRematch('non-existent-id', 'p2')).toThrow('Game room not found');
    });
});

describe('GameRoomService.declineRematch', () => {
    let service: GameRoomService;
    let room: ChessGameRoom;
    let player1: Player;
    let player2: Player;

    beforeEach(() => {
        service = new GameRoomService();
        player1 = createMockPlayer({ id: 'p1', displayName: 'Alice' });
        player2 = createMockPlayer({ id: 'p2', displayName: 'Bob' });
        room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator: player1,
            creatorColorInput: 'white',
        });
        service.joinGameRoom(room.id, player2);
    });

    it('converts rematch-offer to rematch-decline and returns the updated message', () => {
        service.addMessageToGameRoom(room.id, 'rematch-offer', 'p1');

        const updatedMessage = service.declineRematch(room.id, 'p2');

        expect(updatedMessage.type).toBe('rematch-decline');
        expect(updatedMessage.content).toBe('Rematch declined.');
        expect(updatedMessage.authorId).toBe('p1'); // Original author
    });

    it('updates the message in the game room', () => {
        service.addMessageToGameRoom(room.id, 'rematch-offer', 'p1');

        service.declineRematch(room.id, 'p2');

        const updatedRoom = service.getGameRoomById(room.id);
        expect(updatedRoom!.messages).toHaveLength(1);
        expect(updatedRoom!.messages[0].type).toBe('rematch-decline');
    });

    it('clears the rematch offer from offers tracking', () => {
        service.addMessageToGameRoom(room.id, 'rematch-offer', 'p1');

        service.declineRematch(room.id, 'p2');

        const offers = service.getOffersForGameRoom(room.id);
        expect(offers!['rematch-offer']).toBeNull();
    });

    it('throws UnauthorizedError when player responds to their own offer', () => {
        service.addMessageToGameRoom(room.id, 'rematch-offer', 'p1');

        expect(() => service.declineRematch(room.id, 'p1')).toThrow(UnauthorizedError);
        expect(() => service.declineRematch(room.id, 'p1')).toThrow('Player cannot respond to their own offer');
    });

    it('throws error when no active rematch offer exists', () => {
        expect(() => service.declineRematch(room.id, 'p2')).toThrow('No active offer to respond to');
    });

    it('throws error when game room does not exist', () => {
        expect(() => service.declineRematch('non-existent-id', 'p2')).toThrow('Game room not found');
    });
});

describe('GameRoomService.deleteGameRoom', () => {
    it('deletes the game room and returns true', () => {
        const service = new GameRoomService();
        const creator = createMockPlayer();
        const room = service.createGameRoom({
            timeControl: createMockTimeControl(),
            roomType: 'player-vs-player',
            creator,
            creatorColorInput: 'white',
        });

        const result = service.deleteGameRoom(room.id);

        expect(result).toBe(true);
        expect(service.getGameRoomById(room.id)).toBeNull();
        expect(service.getOffersForGameRoom(room.id)).toBeNull();
    });

    it('returns false when game room does not exist', () => {
        const service = new GameRoomService();

        const result = service.deleteGameRoom('non-existent-id');

        expect(result).toBe(false);
    });
});
