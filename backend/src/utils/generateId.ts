import crypto from 'crypto';

import base32Encode from 'base32-encode';

export function generateId(length: number = 5): string {
    const bytes = crypto.randomBytes(length);
    const encoded = base32Encode(bytes, 'Crockford');
    return encoded;
}
