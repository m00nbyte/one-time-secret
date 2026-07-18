// src/libs/crypto.ts

import crypto from 'crypto';

function getPepper(): string {
    return process.env.PASSWORD_PEPPER ?? '';
}

export function hashPassword(password: string): string {
    const salt = crypto.randomBytes(16);
    const peppered = `${password}${getPepper()}`;
    const hash = crypto.scryptSync(peppered, salt, 32);

    return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
    const [saltHex, hashHex] = stored.split(':');
    if (!saltHex || !hashHex) return false;

    const salt = Buffer.from(saltHex, 'hex');
    const storedHash = Buffer.from(hashHex, 'hex');
    const peppered = `${password}${getPepper()}`;
    const candidate = crypto.scryptSync(peppered, salt, storedHash.length);

    return crypto.timingSafeEqual(candidate, storedHash);
}
