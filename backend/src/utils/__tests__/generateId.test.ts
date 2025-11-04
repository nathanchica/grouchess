import crypto from 'crypto';

import { generateId, generateUniqueMessageId } from '../generateId.js';

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

describe('generateUniqueMessageId', () => {
    beforeEach(() => {
        base32EncodeMock.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns a unique ID when no collisions occur', () => {
        const existingIds = new Set(['id-1', 'id-2', 'id-3']);
        const randomBytesResult = Buffer.alloc(12, 0xab);
        const randomBytesSpy = vi.spyOn(crypto, 'randomBytes').mockImplementation(() => randomBytesResult);
        base32EncodeMock.mockReturnValueOnce('unique-id');

        const result = generateUniqueMessageId(existingIds, { length: 12, maxAttempts: 10 });

        expect(result).toBe('unique-id');
        expect(randomBytesSpy).toHaveBeenCalledTimes(1);
        expect(randomBytesSpy).toHaveBeenCalledWith(12);
        expect(base32EncodeMock).toHaveBeenCalledTimes(1);
    });

    it('retries when collisions occur and eventually finds a unique ID', () => {
        const existingIds = new Set(['id-1', 'id-2']);
        const randomBytesResult = Buffer.alloc(12, 0xab);
        const randomBytesSpy = vi.spyOn(crypto, 'randomBytes').mockImplementation(() => randomBytesResult);
        // First two attempts collide, third attempt succeeds
        base32EncodeMock.mockReturnValueOnce('id-1').mockReturnValueOnce('id-2').mockReturnValueOnce('unique-id');

        const result = generateUniqueMessageId(existingIds, { length: 12, maxAttempts: 10 });

        expect(result).toBe('unique-id');
        expect(randomBytesSpy).toHaveBeenCalledTimes(3);
        expect(base32EncodeMock).toHaveBeenCalledTimes(3);
    });

    it('throws error when max attempts is reached without finding unique ID', () => {
        const existingIds = new Set(['same-id']);
        const randomBytesResult = Buffer.alloc(12, 0xab);
        const randomBytesSpy = vi.spyOn(crypto, 'randomBytes').mockImplementation(() => randomBytesResult);
        // Always return the same ID to trigger max retries
        base32EncodeMock.mockReturnValue('same-id');

        expect(() => generateUniqueMessageId(existingIds, { length: 12, maxAttempts: 5 })).toThrow(
            'Failed to generate a unique message ID after maximum retries'
        );
        expect(randomBytesSpy).toHaveBeenCalledTimes(5);
        expect(base32EncodeMock).toHaveBeenCalledTimes(5);
    });

    it.each([
        { scenario: 'length 8, maxAttempts 5', length: 8, maxAttempts: 5 },
        { scenario: 'length 16, maxAttempts 20', length: 16, maxAttempts: 20 },
    ])('uses provided $scenario parameters', ({ length, maxAttempts }) => {
        const existingIds = new Set<string>();
        const randomBytesResult = Buffer.alloc(length, 0xab);
        const randomBytesSpy = vi.spyOn(crypto, 'randomBytes').mockImplementation(() => randomBytesResult);
        base32EncodeMock.mockReturnValueOnce('test-id');

        const result = generateUniqueMessageId(existingIds, { length, maxAttempts });

        expect(result).toBe('test-id');
        expect(randomBytesSpy).toHaveBeenCalledWith(length);
    });

    it('works with empty existingIds set', () => {
        const existingIds = new Set<string>();
        const randomBytesResult = Buffer.alloc(12, 0xab);
        const randomBytesSpy = vi.spyOn(crypto, 'randomBytes').mockImplementation(() => randomBytesResult);
        base32EncodeMock.mockReturnValueOnce('first-id');

        const result = generateUniqueMessageId(existingIds, { length: 12, maxAttempts: 10 });

        expect(result).toBe('first-id');
        expect(randomBytesSpy).toHaveBeenCalledTimes(1);
    });

    it('uses default maxAttempts when not provided in options', () => {
        const existingIds = new Set(['same-id']);
        const randomBytesResult = Buffer.alloc(8, 0xab);
        const randomBytesSpy = vi.spyOn(crypto, 'randomBytes').mockImplementation(() => randomBytesResult);
        base32EncodeMock.mockReturnValue('same-id');

        expect(() => generateUniqueMessageId(existingIds, { length: 8 })).toThrow(
            'Failed to generate a unique message ID after maximum retries'
        );
        // Should use default max attempts of 10
        expect(randomBytesSpy).toHaveBeenCalledTimes(10);
    });

    it('uses default length when not provided in options', () => {
        const existingIds = new Set<string>();
        const randomBytesResult = Buffer.alloc(5, 0xab);
        const randomBytesSpy = vi.spyOn(crypto, 'randomBytes').mockImplementation(() => randomBytesResult);
        base32EncodeMock.mockReturnValueOnce('default-length-id');

        const result = generateUniqueMessageId(existingIds, { maxAttempts: 5 });

        expect(result).toBe('default-length-id');
        // Should use default length of 5 from generateId
        expect(randomBytesSpy).toHaveBeenCalledWith(5);
    });

    it('works with no options provided', () => {
        const existingIds = new Set<string>();
        const randomBytesResult = Buffer.alloc(5, 0xab);
        const randomBytesSpy = vi.spyOn(crypto, 'randomBytes').mockImplementation(() => randomBytesResult);
        base32EncodeMock.mockReturnValueOnce('no-options-id');

        const result = generateUniqueMessageId(existingIds);

        expect(result).toBe('no-options-id');
        // Uses default length of 5 and default maxAttempts of 10
        expect(randomBytesSpy).toHaveBeenCalledWith(5);
    });
});
