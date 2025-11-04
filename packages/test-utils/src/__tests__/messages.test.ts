import { describe, it, expect } from 'vitest';

import { createMockMessage } from '../messages.js';

describe('createMockMessage', () => {
    it('should create default message', () => {
        const message = createMockMessage();

        expect(message).toEqual({
            id: 'message-1',
            type: 'standard',
            createdAt: new Date('2024-01-01T00:00:00.000Z'),
            authorId: 'player-1',
            content: 'Hello',
        });
    });

    it('should apply custom id', () => {
        const message = createMockMessage({
            id: 'msg-123',
        });

        expect(message.id).toBe('msg-123');
    });

    it('should apply custom type', () => {
        const message = createMockMessage({
            type: 'rematch-offer',
        });

        expect(message.type).toBe('rematch-offer');
    });

    it('should apply custom authorId', () => {
        const message = createMockMessage({
            authorId: 'player-456',
        });

        expect(message.authorId).toBe('player-456');
    });

    it('should apply custom content', () => {
        const message = createMockMessage({
            content: 'Good game!',
        });

        expect(message.content).toBe('Good game!');
    });

    it('should apply custom createdAt', () => {
        const timestamp = new Date('2024-06-15T12:30:00.000Z');
        const message = createMockMessage({
            createdAt: timestamp,
        });

        expect(message.createdAt).toBe(timestamp);
    });

    it('should create message without content', () => {
        const message = createMockMessage({
            content: undefined,
        });

        expect(message.content).toBeUndefined();
    });

    it('should apply multiple overrides', () => {
        const message = createMockMessage({
            id: 'msg-789',
            type: 'rematch-offer',
            authorId: 'player-999',
            content: undefined,
        });

        expect(message).toEqual({
            id: 'msg-789',
            type: 'rematch-offer',
            createdAt: new Date('2024-01-01T00:00:00.000Z'),
            authorId: 'player-999',
            content: undefined,
        });
    });

    it.each([
        { type: 'standard' as const },
        { type: 'rematch-offer' as const },
        { type: 'rematch-accept' as const },
        { type: 'rematch-decline' as const },
        { type: 'player-left-room' as const },
        { type: 'player-rejoined-room' as const },
    ])('should create message with type: $type', ({ type }) => {
        const message = createMockMessage({ type });

        expect(message.type).toBe(type);
    });

    it('should create rematch offer message', () => {
        const message = createMockMessage({
            type: 'rematch-offer',
            content: undefined,
        });

        expect(message.type).toBe('rematch-offer');
        expect(message.content).toBeUndefined();
    });

    it('should create rematch accept message', () => {
        const message = createMockMessage({
            type: 'rematch-accept',
            content: 'Rematch accepted.',
        });

        expect(message.type).toBe('rematch-accept');
        expect(message.content).toBe('Rematch accepted.');
    });

    it('should create player left system message', () => {
        const message = createMockMessage({
            type: 'player-left-room',
            content: 'Alice has left the room',
        });

        expect(message.type).toBe('player-left-room');
        expect(message.content).toBe('Alice has left the room');
    });

    it('should create player rejoined system message', () => {
        const message = createMockMessage({
            type: 'player-rejoined-room',
            content: 'Bob has rejoined the room',
        });

        expect(message.type).toBe('player-rejoined-room');
        expect(message.content).toBe('Bob has rejoined the room');
    });

    it('should create multiple distinct messages', () => {
        const message1 = createMockMessage({
            id: 'msg-1',
            authorId: 'player-1',
            content: 'Hello',
        });
        const message2 = createMockMessage({
            id: 'msg-2',
            authorId: 'player-2',
            content: 'Hi there!',
        });

        expect(message1.id).toBe('msg-1');
        expect(message2.id).toBe('msg-2');
        expect(message1.content).toBe('Hello');
        expect(message2.content).toBe('Hi there!');
    });

    it('should handle long content within max length', () => {
        const longContent = 'A'.repeat(140); // MAX_MESSAGE_LENGTH
        const message = createMockMessage({
            content: longContent,
        });

        expect(message.content).toBe(longContent);
        expect(message.content?.length).toBe(140);
    });

    it('should create chat conversation messages', () => {
        const messages = [
            createMockMessage({
                id: '1',
                authorId: 'alice',
                content: 'Good luck!',
                createdAt: new Date('2024-01-01T10:00:00.000Z'),
            }),
            createMockMessage({
                id: '2',
                authorId: 'bob',
                content: 'Thanks, you too!',
                createdAt: new Date('2024-01-01T10:00:05.000Z'),
            }),
            createMockMessage({
                id: '3',
                type: 'player-left-room',
                authorId: 'alice',
                content: 'Alice has left the room.',
                createdAt: new Date('2024-01-01T10:05:00.000Z'),
            }),
        ];

        expect(messages).toHaveLength(3);
        expect(messages[0].content).toBe('Good luck!');
        expect(messages[1].content).toBe('Thanks, you too!');
        expect(messages[2].type).toBe('player-left-room');
    });
});
