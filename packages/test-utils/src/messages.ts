import type { ChessGameMessage, Message } from '@grouchess/models';

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
 * // Create rematch offer message
 * const rematchOffer = createMockMessage({
 *   type: 'rematch-offer',
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

/**
 * Creates a mock ChessGameMessage
 * @param overrides - Partial overrides for the message
 * @returns A complete ChessGameMessage object
 *
 * @example
 * // Create default message
 * const message = createMockChessGameMessage();
 *
 * @example
 * // Create message with custom content
 * const message = createMockChessGameMessage({
 *   authorId: 'player-123',
 *   content: 'Good game!',
 * });
 *
 * @example
 * // Create draw offer message
 * const drawOffer = createMockChessGameMessage({
 *   type: 'draw-offer',
 *   content: undefined,
 * });
 *
 * @example
 * // Create system message (player left)
 * const systemMessage = createMockChessGameMessage({
 *   type: 'player-left-room',
 *   content: 'Alice has left the room',
 * });
 */
export function createMockChessGameMessage(overrides?: Partial<ChessGameMessage>): ChessGameMessage {
    return {
        id: 'message-1',
        type: 'standard',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        authorId: 'player-1',
        content: 'Hello',
        ...overrides,
    };
}
