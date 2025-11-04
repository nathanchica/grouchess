import type { ChessGameMessage } from '@grouchess/models';

import { UnauthorizedError } from '../../utils/errors.js';
import { MessageService } from '../messageService.js';

describe('MessageService.initializeRoom', () => {
    it('initializes empty messages and offers for a room', () => {
        const service = new MessageService();
        const roomId = 'room-1';

        service.initializeRoom(roomId);

        const messages = service.getMessagesForRoom(roomId);
        const offers = service.getActiveOffers(roomId);

        expect(messages).toEqual([]);
        expect(offers).toEqual({ 'draw-offer': null, 'rematch-offer': null });
    });
});

describe('MessageService.getMessagesForRoom', () => {
    it('returns all messages for a room', () => {
        const service = new MessageService();
        const roomId = 'room-1';
        service.initializeRoom(roomId);

        const message1 = service.addMessageToRoom(roomId, 'standard', 'p1', 'Alice', 'Hello');
        const message2 = service.addMessageToRoom(roomId, 'standard', 'p2', 'Bob', 'Hi');

        const messages = service.getMessagesForRoom(roomId);

        expect(messages).toHaveLength(2);
        expect(messages).toEqual([message1, message2]);
    });

    it('returns a clone of messages', () => {
        const service = new MessageService();
        const roomId = 'room-1';
        service.initializeRoom(roomId);

        service.addMessageToRoom(roomId, 'standard', 'p1', 'Alice', 'Hello');

        const messages1 = service.getMessagesForRoom(roomId);
        messages1[0].content = 'Modified';

        const messages2 = service.getMessagesForRoom(roomId);
        expect(messages2[0].content).toBe('Hello');
    });

    it('throws error when room does not exist', () => {
        const service = new MessageService();

        expect(() => service.getMessagesForRoom('non-existent-id')).toThrow('Messages not found for room');
    });
});

describe('MessageService.getActiveOffers', () => {
    it('returns active offers for a room', () => {
        const service = new MessageService();
        const roomId = 'room-1';
        service.initializeRoom(roomId);

        const offers = service.getActiveOffers(roomId);

        expect(offers).toEqual({ 'draw-offer': null, 'rematch-offer': null });
    });

    it('returns a clone of offers', () => {
        const service = new MessageService();
        const roomId = 'room-1';
        service.initializeRoom(roomId);

        const offers1 = service.getActiveOffers(roomId);
        offers1['draw-offer'] = { id: 'msg-1' } as ChessGameMessage;

        const offers2 = service.getActiveOffers(roomId);
        expect(offers2['draw-offer']).toBeNull();
    });

    it('throws error when room does not exist', () => {
        const service = new MessageService();

        expect(() => service.getActiveOffers('non-existent-id')).toThrow('Offers not found for room');
    });
});

describe('MessageService.addMessageToRoom', () => {
    it('adds a standard message to the room', () => {
        const service = new MessageService();
        const roomId = 'room-1';
        service.initializeRoom(roomId);

        const message = service.addMessageToRoom(roomId, 'standard', 'p1', 'Alice', 'Hello world!');

        expect(message.id).toBeDefined();
        expect(message.type).toBe('standard');
        expect(message.authorId).toBe('p1');
        expect(message.content).toBe('Hello world!');
        expect(message.createdAt).toBeInstanceOf(Date);

        const messages = service.getMessagesForRoom(roomId);
        expect(messages).toHaveLength(1);
        expect(messages[0]).toEqual(message);
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
        const service = new MessageService();
        const roomId = 'room-1';
        service.initializeRoom(roomId);

        const message = service.addMessageToRoom(roomId, messageType, 'p1', displayName);

        expect(message.content).toBe(expectedContent);
    });

    it('enforces MAX_MESSAGES_PER_ROOM limit', () => {
        const service = new MessageService();
        const roomId = 'room-1';
        service.initializeRoom(roomId);

        // Add 102 messages (MAX_MESSAGES_PER_ROOM is 100)
        const messages: ChessGameMessage[] = [];
        for (let i = 0; i < 102; i++) {
            messages.push(service.addMessageToRoom(roomId, 'standard', 'p1', 'Alice', `Message ${i}`));
        }

        const allMessages = service.getMessagesForRoom(roomId);
        expect(allMessages).toHaveLength(100);
        // First two messages should be removed
        expect(allMessages[0].id).toBe(messages[2].id);
        expect(allMessages[99].id).toBe(messages[101].id);
    });

    it.each([
        { scenario: 'draw-offer', offerType: 'draw-offer' as const },
        { scenario: 'rematch-offer', offerType: 'rematch-offer' as const },
    ])('tracks $scenario messages in offers', ({ offerType }) => {
        const service = new MessageService();
        const roomId = 'room-1';
        service.initializeRoom(roomId);

        const message = service.addMessageToRoom(roomId, offerType, 'p1', 'Alice');

        const offers = service.getActiveOffers(roomId);
        expect(offers[offerType]).toEqual(message);
    });

    it.each([
        { scenario: 'draw-offer', offerType: 'draw-offer' as const },
        { scenario: 'rematch-offer', offerType: 'rematch-offer' as const },
    ])('throws error when adding duplicate $scenario', ({ offerType }) => {
        const service = new MessageService();
        const roomId = 'room-1';
        service.initializeRoom(roomId);

        service.addMessageToRoom(roomId, offerType, 'p1', 'Alice');

        expect(() => service.addMessageToRoom(roomId, offerType, 'p1', 'Alice')).toThrow(
            `There is already an active ${offerType}`
        );
    });

    it('throws error when room does not exist', () => {
        const service = new MessageService();

        expect(() => service.addMessageToRoom('non-existent-id', 'standard', 'p1', 'Alice', 'Hello')).toThrow(
            'Messages not found for room'
        );
    });

    it.each([
        { scenario: 'draw-accept', messageType: 'draw-accept' as const },
        { scenario: 'draw-decline', messageType: 'draw-decline' as const },
        { scenario: 'rematch-accept', messageType: 'rematch-accept' as const },
        { scenario: 'rematch-decline', messageType: 'rematch-decline' as const },
    ])('throws error when directly adding $scenario offer response message', ({ messageType }) => {
        const service = new MessageService();
        const roomId = 'room-1';
        service.initializeRoom(roomId);

        expect(() => service.addMessageToRoom(roomId, messageType, 'p1', 'Alice')).toThrow(
            'Cannot directly add an offer response message. Must use respondToOffer method.'
        );
    });
});

describe('MessageService.deleteMessagesForRoom', () => {
    it('deletes all messages and offers for a room', () => {
        const service = new MessageService();
        const roomId = 'room-1';
        service.initializeRoom(roomId);
        service.addMessageToRoom(roomId, 'standard', 'p1', 'Alice', 'Hello');

        const result = service.deleteMessagesForRoom(roomId);

        expect(result).toBe(true);
        expect(() => service.getMessagesForRoom(roomId)).toThrow('Messages not found for room');
        expect(() => service.getActiveOffers(roomId)).toThrow('Offers not found for room');
    });

    it('returns false when room does not exist', () => {
        const service = new MessageService();

        const result = service.deleteMessagesForRoom('non-existent-id');

        expect(result).toBe(false);
    });
});

describe('MessageService.hasActiveOffer', () => {
    it('returns true when there is an active offer of the given type', () => {
        const service = new MessageService();
        const roomId = 'room-1';
        service.initializeRoom(roomId);
        service.addMessageToRoom(roomId, 'draw-offer', 'p1', 'Alice');

        const hasOffer = service.hasActiveOffer(roomId, 'draw-offer');

        expect(hasOffer).toBe(true);
    });

    it('returns false when there is no active offer of the given type', () => {
        const service = new MessageService();
        const roomId = 'room-1';
        service.initializeRoom(roomId);

        const hasOffer = service.hasActiveOffer(roomId, 'draw-offer');

        expect(hasOffer).toBe(false);
    });

    it('throws error when room does not exist', () => {
        const service = new MessageService();

        expect(() => service.hasActiveOffer('non-existent-id', 'draw-offer')).toThrow('Offers not found for room');
    });
});

describe('MessageService.clearOffersForRoom', () => {
    it('resets offers to initial state', () => {
        const service = new MessageService();
        const roomId = 'room-1';
        service.initializeRoom(roomId);
        service.addMessageToRoom(roomId, 'draw-offer', 'p1', 'Alice');
        service.addMessageToRoom(roomId, 'rematch-offer', 'p2', 'Bob');

        service.clearOffersForRoom(roomId);

        const offers = service.getActiveOffers(roomId);
        expect(offers).toEqual({ 'draw-offer': null, 'rematch-offer': null });
    });
});

describe('MessageService.acceptDraw', () => {
    let service: MessageService;
    let roomId: string;

    beforeEach(() => {
        service = new MessageService();
        roomId = 'room-1';
        service.initializeRoom(roomId);
    });

    it('converts draw-offer to draw-accept and returns the updated message', () => {
        service.addMessageToRoom(roomId, 'draw-offer', 'p1', 'Alice');

        const updatedMessage = service.acceptDraw(roomId, 'p2');

        expect(updatedMessage.type).toBe('draw-accept');
        expect(updatedMessage.content).toBe('Draw accepted.');
        expect(updatedMessage.authorId).toBe('p1'); // Original author
    });

    it('updates the message in storage', () => {
        service.addMessageToRoom(roomId, 'draw-offer', 'p1', 'Alice');

        service.acceptDraw(roomId, 'p2');

        const messages = service.getMessagesForRoom(roomId);
        expect(messages).toHaveLength(1);
        expect(messages[0].type).toBe('draw-accept');
    });

    it('clears the draw offer from offers tracking', () => {
        service.addMessageToRoom(roomId, 'draw-offer', 'p1', 'Alice');

        service.acceptDraw(roomId, 'p2');

        const offers = service.getActiveOffers(roomId);
        expect(offers['draw-offer']).toBeNull();
    });

    it('throws UnauthorizedError when player responds to their own offer', () => {
        service.addMessageToRoom(roomId, 'draw-offer', 'p1', 'Alice');

        expect(() => service.acceptDraw(roomId, 'p1')).toThrow(UnauthorizedError);
        expect(() => service.acceptDraw(roomId, 'p1')).toThrow('Player cannot respond to their own offer');
    });

    it('throws error when no active draw offer exists', () => {
        expect(() => service.acceptDraw(roomId, 'p2')).toThrow('No active offer to respond to');
    });

    it('throws error when room does not exist', () => {
        expect(() => service.acceptDraw('non-existent-id', 'p2')).toThrow('Messages not found for room');
    });
});

describe('MessageService.declineDraw', () => {
    let service: MessageService;
    let roomId: string;

    beforeEach(() => {
        service = new MessageService();
        roomId = 'room-1';
        service.initializeRoom(roomId);
    });

    it('converts draw-offer to draw-decline and returns the updated message', () => {
        service.addMessageToRoom(roomId, 'draw-offer', 'p1', 'Alice');

        const updatedMessage = service.declineDraw(roomId, 'p2');

        expect(updatedMessage.type).toBe('draw-decline');
        expect(updatedMessage.content).toBe('Draw declined.');
        expect(updatedMessage.authorId).toBe('p1'); // Original author
    });

    it('updates the message in storage', () => {
        service.addMessageToRoom(roomId, 'draw-offer', 'p1', 'Alice');

        service.declineDraw(roomId, 'p2');

        const messages = service.getMessagesForRoom(roomId);
        expect(messages).toHaveLength(1);
        expect(messages[0].type).toBe('draw-decline');
    });

    it('clears the draw offer from offers tracking', () => {
        service.addMessageToRoom(roomId, 'draw-offer', 'p1', 'Alice');

        service.declineDraw(roomId, 'p2');

        const offers = service.getActiveOffers(roomId);
        expect(offers['draw-offer']).toBeNull();
    });

    it('throws UnauthorizedError when player responds to their own offer', () => {
        service.addMessageToRoom(roomId, 'draw-offer', 'p1', 'Alice');

        expect(() => service.declineDraw(roomId, 'p1')).toThrow(UnauthorizedError);
        expect(() => service.declineDraw(roomId, 'p1')).toThrow('Player cannot respond to their own offer');
    });

    it('throws error when no active draw offer exists', () => {
        expect(() => service.declineDraw(roomId, 'p2')).toThrow('No active offer to respond to');
    });

    it('throws error when room does not exist', () => {
        expect(() => service.declineDraw('non-existent-id', 'p2')).toThrow('Messages not found for room');
    });
});

describe('MessageService.acceptRematch', () => {
    let service: MessageService;
    let roomId: string;

    beforeEach(() => {
        service = new MessageService();
        roomId = 'room-1';
        service.initializeRoom(roomId);
    });

    it('converts rematch-offer to rematch-accept and returns the updated message', () => {
        service.addMessageToRoom(roomId, 'rematch-offer', 'p1', 'Alice');

        const updatedMessage = service.acceptRematch(roomId, 'p2');

        expect(updatedMessage.type).toBe('rematch-accept');
        expect(updatedMessage.content).toBe('Rematch accepted.');
        expect(updatedMessage.authorId).toBe('p1'); // Original author
    });

    it('updates the message in storage', () => {
        service.addMessageToRoom(roomId, 'rematch-offer', 'p1', 'Alice');

        service.acceptRematch(roomId, 'p2');

        const messages = service.getMessagesForRoom(roomId);
        expect(messages).toHaveLength(1);
        expect(messages[0].type).toBe('rematch-accept');
    });

    it('clears the rematch offer from offers tracking', () => {
        service.addMessageToRoom(roomId, 'rematch-offer', 'p1', 'Alice');

        service.acceptRematch(roomId, 'p2');

        const offers = service.getActiveOffers(roomId);
        expect(offers['rematch-offer']).toBeNull();
    });

    it('throws UnauthorizedError when player responds to their own offer', () => {
        service.addMessageToRoom(roomId, 'rematch-offer', 'p1', 'Alice');

        expect(() => service.acceptRematch(roomId, 'p1')).toThrow(UnauthorizedError);
        expect(() => service.acceptRematch(roomId, 'p1')).toThrow('Player cannot respond to their own offer');
    });

    it('throws error when no active rematch offer exists', () => {
        expect(() => service.acceptRematch(roomId, 'p2')).toThrow('No active offer to respond to');
    });

    it('throws error when room does not exist', () => {
        expect(() => service.acceptRematch('non-existent-id', 'p2')).toThrow('Messages not found for room');
    });
});

describe('MessageService.declineRematch', () => {
    let service: MessageService;
    let roomId: string;

    beforeEach(() => {
        service = new MessageService();
        roomId = 'room-1';
        service.initializeRoom(roomId);
    });

    it('converts rematch-offer to rematch-decline and returns the updated message', () => {
        service.addMessageToRoom(roomId, 'rematch-offer', 'p1', 'Alice');

        const updatedMessage = service.declineRematch(roomId, 'p2');

        expect(updatedMessage.type).toBe('rematch-decline');
        expect(updatedMessage.content).toBe('Rematch declined.');
        expect(updatedMessage.authorId).toBe('p1'); // Original author
    });

    it('updates the message in storage', () => {
        service.addMessageToRoom(roomId, 'rematch-offer', 'p1', 'Alice');

        service.declineRematch(roomId, 'p2');

        const messages = service.getMessagesForRoom(roomId);
        expect(messages).toHaveLength(1);
        expect(messages[0].type).toBe('rematch-decline');
    });

    it('clears the rematch offer from offers tracking', () => {
        service.addMessageToRoom(roomId, 'rematch-offer', 'p1', 'Alice');

        service.declineRematch(roomId, 'p2');

        const offers = service.getActiveOffers(roomId);
        expect(offers['rematch-offer']).toBeNull();
    });

    it('throws UnauthorizedError when player responds to their own offer', () => {
        service.addMessageToRoom(roomId, 'rematch-offer', 'p1', 'Alice');

        expect(() => service.declineRematch(roomId, 'p1')).toThrow(UnauthorizedError);
        expect(() => service.declineRematch(roomId, 'p1')).toThrow('Player cannot respond to their own offer');
    });

    it('throws error when no active rematch offer exists', () => {
        expect(() => service.declineRematch(roomId, 'p2')).toThrow('No active offer to respond to');
    });

    it('throws error when room does not exist', () => {
        expect(() => service.declineRematch('non-existent-id', 'p2')).toThrow('Messages not found for room');
    });
});
