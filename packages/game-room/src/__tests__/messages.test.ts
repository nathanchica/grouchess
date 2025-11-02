import {
    getChessOfferResponseContent,
    getOfferResponseTypes,
    isOfferMessageType,
    isOfferResponseMessageType,
    type ChessGameOfferMessage,
    type ChessGameOfferResponseMessage,
} from '../messages.js';

describe('getOfferResponseTypes', () => {
    it.each([
        {
            offerType: 'draw-offer' as ChessGameOfferMessage,
            expected: { accept: 'draw-accept', decline: 'draw-decline' },
        },
        {
            offerType: 'rematch-offer' as ChessGameOfferMessage,
            expected: { accept: 'rematch-accept', decline: 'rematch-decline' },
        },
    ])('returns responses for $offerType', ({ offerType, expected }) => {
        expect(getOfferResponseTypes(offerType)).toEqual(expected);
    });

    it('returns undefined for unknown offers', () => {
        expect(getOfferResponseTypes('standard' as ChessGameOfferMessage)).toBeUndefined();
    });
});

describe('isOfferMessageType', () => {
    it.each([
        { value: 'draw-offer', expected: true },
        { value: 'rematch-offer', expected: true },
    ])('identifies offer message $value', ({ value, expected }) => {
        expect(isOfferMessageType(value)).toBe(expected);
    });

    it('filters offer messages while narrowing type', () => {
        const values = ['draw-offer', 'standard', 'rematch-offer'];
        const offers = values.filter(isOfferMessageType);

        expect(offers).toEqual(['draw-offer', 'rematch-offer']);
    });

    it('returns false for non-offer message types', () => {
        expect(isOfferMessageType('standard')).toBe(false);
    });
});

describe('isOfferResponseMessageType', () => {
    it.each([
        { value: 'draw-accept', expected: true },
        { value: 'draw-decline', expected: true },
        { value: 'rematch-accept', expected: true },
        { value: 'rematch-decline', expected: true },
    ])('identifies offer response $value', ({ value, expected }) => {
        expect(isOfferResponseMessageType(value)).toBe(expected);
    });

    it('filters offer response messages while narrowing type', () => {
        const values = ['draw-accept', 'draw-offer', 'rematch-decline'];
        const responses = values.filter(isOfferResponseMessageType);

        expect(responses).toEqual(['draw-accept', 'rematch-decline']);
    });

    it('returns false for non-offer response message types', () => {
        expect(isOfferResponseMessageType('standard')).toBe(false);
    });
});

describe('getChessOfferResponseContent', () => {
    it.each([
        { value: 'draw-accept', expected: 'Draw accepted.' },
        { value: 'draw-decline', expected: 'Draw declined.' },
        { value: 'rematch-accept', expected: 'Rematch accepted.' },
        { value: 'rematch-decline', expected: 'Rematch declined.' },
    ])('returns expected message for $value', ({ value, expected }) => {
        expect(getChessOfferResponseContent(value as ChessGameOfferResponseMessage)).toBe(expected);
    });
});
