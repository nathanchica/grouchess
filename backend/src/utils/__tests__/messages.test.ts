import type { ChessGameOfferMessage } from '@grouchess/models';
import { createMockMessage } from '@grouchess/test-utils';

import { UnauthorizedError } from '../errors.js';
import { createChessGameSystemMessageContent, updateOfferMessageToOfferResponse } from '../messages.js';

describe('createChessGameSystemMessageContent', () => {
    it.each([
        {
            scenario: 'draw offer',
            messageType: 'draw-offer' as const,
            displayName: 'Alice',
            expected: 'Alice is offering a draw...',
        },
        {
            scenario: 'rematch offer',
            messageType: 'rematch-offer' as const,
            displayName: 'Bob',
            expected: 'Bob is offering a rematch...',
        },
        {
            scenario: 'player left room',
            messageType: 'player-left-room' as const,
            displayName: 'Charlie',
            expected: 'Charlie has left the room.',
        },
        {
            scenario: 'player rejoined room',
            messageType: 'player-rejoined-room' as const,
            displayName: 'David',
            expected: 'David has rejoined the room.',
        },
    ])('should create correct message for $scenario', ({ messageType, displayName, expected }) => {
        const result = createChessGameSystemMessageContent(messageType, displayName);
        expect(result).toBe(expected);
    });

    it('should throw error for invalid message type', () => {
        // Using `any` to force an invalid type
        const invalidType = 'invalid-type' as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(() => createChessGameSystemMessageContent(invalidType, 'Alice')).toThrow(
            'Invalid system message type: invalid-type'
        );
    });
});

describe('updateOfferMessageToOfferResponse', () => {
    const offerAuthorId = 'player-1';
    const respondingPlayerId = 'player-2';

    describe('draw offers', () => {
        it.each([
            {
                scenario: 'accepting',
                accept: true,
                expectedType: 'draw-accept' as const,
                expectedContent: 'Draw accepted.',
            },
            {
                scenario: 'declining',
                accept: false,
                expectedType: 'draw-decline' as const,
                expectedContent: 'Draw declined.',
            },
        ])('should handle $scenario a draw offer', ({ accept, expectedType, expectedContent }) => {
            const offerMessage = createMockMessage({
                id: 'msg-1',
                type: 'draw-offer',
                authorId: offerAuthorId,
                content: undefined,
            });
            const otherMessage = createMockMessage({
                id: 'msg-2',
                type: 'standard',
                content: 'Hello',
            });
            const messages = [otherMessage, offerMessage];

            const result = updateOfferMessageToOfferResponse({
                messages,
                offerType: 'draw-offer',
                offerMessageId: 'msg-1',
                respondingPlayerId,
                accept,
            });

            expect(result.messages).toHaveLength(2);
            expect(result.messages[0]).toBe(otherMessage);
            expect(result.messages[1]).toMatchObject({
                id: 'msg-1',
                type: expectedType,
                content: expectedContent,
                authorId: offerAuthorId,
            });
            expect(result.responseMessage).toMatchObject({
                id: 'msg-1',
                type: expectedType,
                content: expectedContent,
            });
        });
    });

    describe('rematch offers', () => {
        it.each([
            {
                scenario: 'accepting',
                accept: true,
                expectedType: 'rematch-accept' as const,
                expectedContent: 'Rematch accepted.',
            },
            {
                scenario: 'declining',
                accept: false,
                expectedType: 'rematch-decline' as const,
                expectedContent: 'Rematch declined.',
            },
        ])('should handle $scenario a rematch offer', ({ accept, expectedType, expectedContent }) => {
            const offerMessage = createMockMessage({
                id: 'msg-1',
                type: 'rematch-offer',
                authorId: offerAuthorId,
                content: undefined,
            });
            const messages = [offerMessage];

            const result = updateOfferMessageToOfferResponse({
                messages,
                offerType: 'rematch-offer',
                offerMessageId: 'msg-1',
                respondingPlayerId,
                accept,
            });

            expect(result.messages).toHaveLength(1);
            expect(result.messages[0]).toMatchObject({
                id: 'msg-1',
                type: expectedType,
                content: expectedContent,
                authorId: offerAuthorId,
            });
            expect(result.responseMessage).toMatchObject({
                id: 'msg-1',
                type: expectedType,
                content: expectedContent,
            });
        });
    });

    describe('error cases', () => {
        it('should throw UnauthorizedError when player tries to respond to their own offer', () => {
            const offerMessage = createMockMessage({
                id: 'msg-1',
                type: 'draw-offer',
                authorId: offerAuthorId,
                content: undefined,
            });
            const messages = [offerMessage];
            const args = {
                messages,
                offerType: 'draw-offer' as const,
                offerMessageId: 'msg-1',
                respondingPlayerId: offerAuthorId, // Same as author
                accept: true,
            };

            expect(() => updateOfferMessageToOfferResponse(args)).toThrow(UnauthorizedError);
            expect(() => updateOfferMessageToOfferResponse(args)).toThrow('Player cannot respond to their own offer');
        });

        it('should throw error when offer message is not found', () => {
            const offerMessage = createMockMessage({
                id: 'msg-1',
                type: 'draw-offer',
                authorId: offerAuthorId,
                content: undefined,
            });
            const messages = [offerMessage];

            expect(() =>
                updateOfferMessageToOfferResponse({
                    messages,
                    offerType: 'draw-offer',
                    offerMessageId: 'msg-999', // Non-existent ID
                    respondingPlayerId,
                    accept: true,
                })
            ).toThrow('Offer message not found or invalid');
        });

        it('should throw error when message type does not match offer type', () => {
            const offerMessage = createMockMessage({
                id: 'msg-1',
                type: 'draw-offer', // Type is draw-offer
                authorId: offerAuthorId,
                content: undefined,
            });
            const messages = [offerMessage];

            expect(() =>
                updateOfferMessageToOfferResponse({
                    messages,
                    offerType: 'rematch-offer', // Looking for rematch-offer
                    offerMessageId: 'msg-1',
                    respondingPlayerId,
                    accept: true,
                })
            ).toThrow('Offer message not found or invalid');
        });

        it('should throw error for invalid offer message type', () => {
            const invalidOfferMessage = createMockMessage({
                id: 'msg-1',
                type: 'chat' as ChessGameOfferMessage, // Invalid offer type
                authorId: offerAuthorId,
                content: 'Hello',
            });
            const messages = [invalidOfferMessage];

            expect(() =>
                updateOfferMessageToOfferResponse({
                    messages,
                    offerType: 'chat' as ChessGameOfferMessage,
                    offerMessageId: 'msg-1',
                    respondingPlayerId,
                    accept: true,
                })
            ).toThrow('Invalid offer message type');
        });
    });

    describe('multiple messages', () => {
        it('should only update the target offer message and leave other messages unchanged', () => {
            const message1 = createMockMessage({ id: 'msg-1', type: 'standard', content: 'Hi' });
            const offerMessage = createMockMessage({
                id: 'msg-2',
                type: 'draw-offer',
                authorId: offerAuthorId,
                content: undefined,
            });
            const message3 = createMockMessage({ id: 'msg-3', type: 'standard', content: 'Bye' });
            const messages = [message1, offerMessage, message3];

            const result = updateOfferMessageToOfferResponse({
                messages,
                offerType: 'draw-offer',
                offerMessageId: 'msg-2',
                respondingPlayerId,
                accept: true,
            });

            expect(result.messages).toHaveLength(3);
            expect(result.messages[0]).toBe(message1); // Unchanged
            expect(result.messages[1]).toMatchObject({
                id: 'msg-2',
                type: 'draw-accept',
                content: 'Draw accepted.',
            });
            expect(result.messages[2]).toBe(message3); // Unchanged
        });
    });
});
