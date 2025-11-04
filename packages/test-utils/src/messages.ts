import type { Message } from '@grouchess/models';

/**
 * Creates a mock Message
 * @param overrides - Partial overrides for the message
 * @returns A complete Message object
 *
 * @example
 * // Create default message
 * const message = createMockMessage();
 *
 * @example
 * // Create message with custom content
 * const message = createMockMessage({
 *   authorId: 'player-123',
 *   content: 'Good game!',
 * });
 *
 * @example
 * // Create draw offer message
 * const drawOffer = createMockMessage({
 *   type: 'draw-offer',
 *   content: undefined,
 * });
 *
 * @example
 * // Create system message (player left)
 * const systemMessage = createMockMessage({
 *   type: 'player-left-room',
 *   content: 'Alice has left the room',
 * });
 */
export function createMockMessage(overrides?: Partial<Message>): Message {
    return {
        id: 'message-1',
        type: 'standard',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        authorId: 'player-1',
        content: 'Hello',
        ...overrides,
    };
}
