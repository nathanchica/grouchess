import crypto from 'crypto';

import base32Encode from 'base32-encode';

export function generateId(length: number = 5): string {
    const bytes = crypto.randomBytes(length);
    const encoded = base32Encode(bytes, 'Crockford');
    return encoded;
}

const DEFAULT_MAX_ATTEMPTS = 10;

type GenerateUniqueIdOptions = {
    length?: number;
    maxAttempts?: number;
};

export function generateUniqueMessageId(existingIds: Set<string>, options?: GenerateUniqueIdOptions): string {
    const { length, maxAttempts = DEFAULT_MAX_ATTEMPTS } = options || {};

    let id: string;
    let attempts = 0;
    do {
        id = generateId(length);
        attempts++;
    } while (existingIds.has(id) && attempts < maxAttempts);
    if (existingIds.has(id)) {
        throw new Error('Failed to generate a unique message ID after maximum retries');
    }
    return id;
}
