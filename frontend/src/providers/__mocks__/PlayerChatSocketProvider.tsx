import type { PlayerChatSocketContextType } from '../PlayerChatSocketProvider';

export function createMockPlayerChatSocketContextValues(
    overrides?: Partial<PlayerChatSocketContextType>
): PlayerChatSocketContextType {
    return {
        messages: [],
        isAwaitingRematchResponse: false,
        sendStandardMessage: () => {},
        sendRematchOffer: () => {},
        acceptDrawOffer: () => {},
        declineDrawOffer: () => {},
        acceptRematchOffer: () => {},
        declineRematchOffer: () => {},
        ...overrides,
    };
}
