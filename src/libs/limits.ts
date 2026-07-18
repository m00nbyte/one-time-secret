// src/libs/limits.ts

import type { ExpiryOption } from '@/types';

/** AES-GCM IV length (bytes), prepended to the ciphertext. */
const GCM_IV_BYTES = 12;
/** AES-GCM authentication tag length (bytes), appended by Web Crypto. */
const GCM_TAG_BYTES = 16;
/** Base64 encodes 3 bytes into 4 chars. */
const BASE64_RATIO = 4 / 3;
/** Small safety margin (JSON envelope, ObjectId, metadata fields). */
const DOC_OVERHEAD_BYTES = 2 * 1024; // 2 KB
/** MongoDB's hard maximum document size. */
const MONGO_MAX_DOC_BYTES = 16 * 1024 * 1024; // 16 MB

/**
 * Maximum number of UTF-8 bytes the plaintext may occupy.
 *
 * 2 MB is ample for text sharing and keeps the resulting ~2.7 MB
 * ciphertext document far below MongoDB's 16 MB cap.
 */
export const MAX_PLAINTEXT_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Brute-force protection for password-protected secrets.
 *
 * Each failed password verification increments the secret's `attempts`
 * counter; once it reaches the per-secret limit the secret is locked.
 * The limit is configurable per secret but bounded to a sane range.
 */
export const DEFAULT_MAX_ATTEMPTS = 5;
export const MIN_MAX_ATTEMPTS = 1;
export const MAX_ALLOWED_ATTEMPTS = 1000;

/**
 * View limits for a secret. A secret can be opened this many times before it
 * is permanently destroyed. Configurable per secret, bounded to a sane range.
 */
export const DEFAULT_MAX_VIEWS = 1;
export const MAX_ALLOWED_VIEWS = 1000;

/**
 * Expiry window for a secret.
 *
 * The user picks one of the {@link EXPIRY_OPTIONS} presets; the server clamps
 * the value to this range.
 */
export const MIN_EXPIRY_HOURS = 10 / 60; // 10 minutes
export const MAX_EXPIRY_HOURS = 24 * 30; // 30 days
export const DEFAULT_EXPIRY_HOURS = 24; // 24 hours

/**
 * Preset expiry options the user can choose from in the UI.
 * Each option's `hours` value is clamped server-side to
 * {@link MIN_EXPIRY_HOURS}–{@link MAX_EXPIRY_HOURS}.
 */
export const EXPIRY_OPTIONS: ExpiryOption[] = [
    { label: '10 minutes', hours: 10 / 60 },
    { label: '1 hour', hours: 1 },
    { label: '24 hours', hours: 24 },
    { label: '3 days', hours: 24 * 3 },
    { label: '7 days', hours: 24 * 7 },
    { label: '30 days', hours: 24 * 30 }
];

/**
 * API rate limiting.
 *
 * A MongoDB-backed fixed-window limiter with a lockout penalty. When a client
 * exceeds {@link RATE_LIMIT_MAX} requests within {@link RATE_LIMIT_WINDOW_SECONDS},
 * it is blocked for {@link RATE_LIMIT_LOCKOUT_SECONDS} before it can call the
 * API again. Only a hashed client IP is stored transiently — never the raw IP.
 */
export const RATE_LIMIT_MAX = 100;
export const RATE_LIMIT_WINDOW_SECONDS = 60;
export const RATE_LIMIT_LOCKOUT_SECONDS = 60;

/**
 * Hard server-side cap on the base64 ciphertext string length.
 * Derived from {@link MAX_PLAINTEXT_BYTES} so the two can never drift.
 *
 * We also make sure the full stored document cannot exceed the Mongo limit.
 */
export const MAX_CIPHERTEXT_LENGTH = Math.min(
    Math.ceil((MAX_PLAINTEXT_BYTES + GCM_IV_BYTES + GCM_TAG_BYTES) * BASE64_RATIO),
    MONGO_MAX_DOC_BYTES - DOC_OVERHEAD_BYTES
);

/** UTF-8 byte length of a string. */
export function utf8ByteLength(str: string): number {
    return new TextEncoder().encode(str).length;
}

/** True when the plaintext would exceed the server's ciphertext cap. */
export function isPlaintextTooLarge(plaintext: string): boolean {
    return utf8ByteLength(plaintext) > MAX_PLAINTEXT_BYTES;
}

/** Human-readable byte size, e.g. `98,276 B` or `96 KB` or `1.2 MB`. */
export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes.toLocaleString()} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;

    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}
