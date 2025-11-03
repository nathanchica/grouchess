import crypto from 'crypto';

import { generateId } from '../generateId.js';

const { base32EncodeMock } = vi.hoisted(() => ({
    base32EncodeMock: vi.fn(),
}));

vi.mock('base32-encode', () => ({
    default: base32EncodeMock,
}));

describe('generateId', () => {
    beforeEach(() => {
        base32EncodeMock.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it.each([
        {
            scenario: 'default length when no argument is provided',
            inputLength: undefined,
            expectedLength: 5,
            encodedValue: 'encoded-default',
        },
        {
            scenario: 'provided length overrides the default',
            inputLength: 12,
            expectedLength: 12,
            encodedValue: 'encoded-custom',
        },
    ])('returns the Crockford encoded id using $scenario', ({ inputLength, expectedLength, encodedValue }) => {
        const randomBytesResult = Buffer.alloc(expectedLength, 0xab);

        const randomBytesSpy = vi.spyOn(crypto, 'randomBytes').mockImplementation(() => randomBytesResult);
        base32EncodeMock.mockReturnValueOnce(encodedValue);

        const result = inputLength === undefined ? generateId() : generateId(inputLength);

        expect(result).toBe(encodedValue);
        expect(randomBytesSpy).toHaveBeenCalledTimes(1);
        expect(randomBytesSpy).toHaveBeenCalledWith(expectedLength);
        expect(base32EncodeMock).toHaveBeenCalledTimes(1);
        expect(base32EncodeMock).toHaveBeenCalledWith(randomBytesResult, 'Crockford');
    });
});
