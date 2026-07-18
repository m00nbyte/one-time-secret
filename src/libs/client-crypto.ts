// src/libs/client-crypto.ts

const IV_LENGTH = 12; // 96-bit IV
const KEY_LENGTH = 256; // bits

/** Convert an ArrayBuffer to a base64 string. */
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const chunk = 0x8000;

    let binary = '';

    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }

    return btoa(binary);
}

/** Convert a base64 string to a Uint8Array. */
export function base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
}

/** Convert a Uint8Array to a hex string. */
export function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

/** Convert a hex string to a Uint8Array. */
export function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);

    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }

    return bytes;
}

/** Byte length of a MongoDB ObjectId (24 hex chars = 12 bytes). */
export const OBJECT_ID_BYTES = 12;
/** Byte length of a raw AES-256 key (64 hex chars = 32 bytes). */
export const AES_KEY_BYTES = 32;

export interface EncryptedPayload {
    /** Base64-encoded IV + ciphertext */
    ciphertext: string;
    /** Hex-encoded raw AES-256 key */
    key: string;
}

const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Encode a byte array as a Base62 string — purely alphanumeric
 * (digits + letters), so it contains no symbols at all. Works on any
 * Number-safe runtime (no BigInt required).
 */
export function bytesToBase62(bytes: Uint8Array): string {
    if (bytes.length === 0) return '';
    if (bytes.every((b) => b === 0)) return '0';

    // Work on a mutable copy; leading zero bytes are insignificant for a
    // big-endian integer and get stripped during conversion.
    const work: number[] = Array.from(bytes);
    let result = '';

    while (work.length > 0) {
        // Drop leading zeros.
        while (work.length > 0 && work[0] === 0) work.shift();
        if (work.length === 0) break;

        let remainder = 0;

        for (let i = 0; i < work.length; i++) {
            const acc = remainder * 256 + work[i];
            work[i] = Math.floor(acc / 62);
            remainder = acc % 62;
        }

        result = BASE62_ALPHABET[remainder] + result;
    }

    return result;
}

/**
 * Decode a Base62 string back into bytes, left-padded to `targetLength`
 * (so fixed-length structures like [ObjectId][key] round-trip correctly).
 * Throws on invalid characters or if the value is too large to fit.
 */
export function base62ToBytes(str: string, targetLength: number): Uint8Array {
    const bytes: number[] = [];

    for (const ch of str) {
        const digit = BASE62_ALPHABET.indexOf(ch);

        if (digit < 0) throw new Error(`Invalid Base62 character: ${ch}`);

        // bytes = bytes * 62 + digit  (big-endian, processed LSB-first)
        let carry = digit;

        for (let i = bytes.length - 1; i >= 0; i--) {
            const v = bytes[i] * 62 + carry;
            bytes[i] = v % 256;
            carry = Math.floor(v / 256);
        }

        while (carry > 0) {
            bytes.unshift(carry % 256);
            carry = Math.floor(carry / 256);
        }
    }

    while (bytes.length < targetLength) bytes.unshift(0);
    if (bytes.length > targetLength) throw new Error('Decoded value too large for target length');

    return new Uint8Array(bytes);
}

/**
 * Pack a MongoDB ObjectId (hex) and an AES-256 key (hex) into one short,
 * purely-alphanumeric Base62 token for use in the URL fragment.
 *
 * Layout: [12 bytes ObjectId][32 bytes raw key] → 44 bytes → ~60 Base62 chars
 * (digits + letters only, no symbols). Lengths are fixed, so no separator
 * is needed.
 */
export function encodeShareToken(idHex: string, keyHex: string): string {
    const idBytes = hexToBytes(idHex);
    const keyBytes = hexToBytes(keyHex);

    if (idBytes.length !== OBJECT_ID_BYTES) {
        throw new Error(`Invalid ObjectId length: expected ${OBJECT_ID_BYTES} bytes, got ${idBytes.length}`);
    }

    if (keyBytes.length !== AES_KEY_BYTES) {
        throw new Error(`Invalid key length: expected ${AES_KEY_BYTES} bytes, got ${keyBytes.length}`);
    }

    const combined = new Uint8Array(OBJECT_ID_BYTES + AES_KEY_BYTES);
    combined.set(idBytes, 0);
    combined.set(keyBytes, OBJECT_ID_BYTES);

    return bytesToBase62(combined);
}

/**
 * Decode a Base62 token back into { id, key }.
 * Returns null if the token cannot be parsed.
 */
export function decodeShareToken(token: string): { id: string; key: string } | null {
    if (!token) return null;

    const TOTAL = OBJECT_ID_BYTES + AES_KEY_BYTES;

    if (!/^[0-9A-Za-z]+$/.test(token)) return null;

    try {
        const bytes = base62ToBytes(token, TOTAL);
        if (bytes.length !== TOTAL) return null;

        return {
            id: bytesToHex(bytes.subarray(0, OBJECT_ID_BYTES)),
            key: bytesToHex(bytes.subarray(OBJECT_ID_BYTES))
        };
    } catch {
        return null;
    }
}

/**
 * Generate a random AES-256 key and encrypt plaintext with AES-256-GCM.
 * Returns the ciphertext and the key.
 */
export async function encryptClient(plaintext: string): Promise<EncryptedPayload> {
    // Generate a fresh random key for each secret
    const cryptoKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: KEY_LENGTH }, true, ['encrypt', 'decrypt']);

    // Export raw key bytes and encode as hex for a clean URL-safe string
    const rawKey = await crypto.subtle.exportKey('raw', cryptoKey);
    const keyHex = bytesToHex(new Uint8Array(rawKey));

    // Encrypt
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encoded = new TextEncoder().encode(plaintext);
    const encryptedBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, encoded);

    // Combine IV + ciphertext into a single blob
    const encryptedBytes = new Uint8Array(encryptedBuffer);
    const combined = new Uint8Array(iv.length + encryptedBytes.length);
    combined.set(iv);
    combined.set(encryptedBytes, iv.length);

    return {
        ciphertext: bufferToBase64(combined),
        key: keyHex
    };
}

/**
 * Decrypt ciphertext using the key extracted from the URL fragment.
 * Throws on tampering (GCM authentication tag verification fails).
 */
export async function decryptClient(ciphertextBase64: string, keyHex: string): Promise<string> {
    const combined = base64ToBytes(ciphertextBase64);
    const iv = combined.subarray(0, IV_LENGTH);
    const data = combined.subarray(IV_LENGTH);

    const rawKey = hexToBytes(keyHex);
    const cryptoKey = await crypto.subtle.importKey('raw', rawKey as BufferSource, { name: 'AES-GCM' }, false, ['decrypt']);

    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, cryptoKey, data as BufferSource);

    return new TextDecoder().decode(decrypted);
}
