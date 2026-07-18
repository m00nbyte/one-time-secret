// src/app/api/secrets/route.ts

import { NextRequest, NextResponse } from 'next/server';

import { hashPassword } from '@/libs/crypto';
import {
    DEFAULT_EXPIRY_HOURS,
    DEFAULT_MAX_ATTEMPTS,
    DEFAULT_MAX_VIEWS,
    formatBytes,
    MAX_ALLOWED_ATTEMPTS,
    MAX_ALLOWED_VIEWS,
    MAX_CIPHERTEXT_LENGTH,
    MAX_EXPIRY_HOURS,
    MAX_PLAINTEXT_BYTES,
    MIN_EXPIRY_HOURS,
    MIN_MAX_ATTEMPTS
} from '@/libs/limits';
import dbConnect from '@/libs/mongodb';
import { checkRateLimit, rateLimitResponse } from '@/libs/rate-limit';
import Event from '@/models/Event';
import Secret from '@/models/Secret';
import type { CreateSecretRequest, CreateSecretResponse } from '@/types';

function jsonResponse<T>(body: T, status = 200) {
    return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
    try {
        const rl = await checkRateLimit(req);

        if (!rl.allowed) {
            return rateLimitResponse(rl);
        }

        const payload = (await req.json()) as CreateSecretRequest;
        const ciphertext = payload?.ciphertext?.trim() ?? '';

        if (!ciphertext) {
            const body: CreateSecretResponse = { success: false, error: 'Encrypted content is required' };
            return jsonResponse(body, 400);
        }

        if (ciphertext.length > MAX_CIPHERTEXT_LENGTH) {
            const body: CreateSecretResponse = {
                success: false,
                error: `Message too large. The encrypted payload must not exceed ${formatBytes(
                    MAX_CIPHERTEXT_LENGTH
                )} (about ${MAX_PLAINTEXT_BYTES.toLocaleString()} characters). Please shorten your message.`
            };
            return jsonResponse(body, 413);
        }

        let expiresInHours = DEFAULT_EXPIRY_HOURS;

        if (payload.expiresInHours !== undefined) {
            const requested = Number(payload.expiresInHours);

            if (!Number.isFinite(requested) || requested <= 0) {
                const body: CreateSecretResponse = { success: false, error: 'Invalid expiry value' };
                return jsonResponse(body, 400);
            }

            expiresInHours = Math.min(Math.max(requested, MIN_EXPIRY_HOURS), MAX_EXPIRY_HOURS);
        }

        let maxViews = DEFAULT_MAX_VIEWS;

        if (payload.maxViews !== undefined && payload.maxViews !== null) {
            const requested = Number(payload.maxViews);

            if (!Number.isFinite(requested) || requested < 1) {
                const body: CreateSecretResponse = { success: false, error: 'Invalid view limit' };
                return jsonResponse(body, 400);
            }

            maxViews = Math.min(Math.floor(requested), MAX_ALLOWED_VIEWS);
        }

        let maxAttempts = DEFAULT_MAX_ATTEMPTS;

        if (payload.maxAttempts !== undefined && payload.maxAttempts !== null) {
            const requested = Number(payload.maxAttempts);

            if (!Number.isFinite(requested) || requested < MIN_MAX_ATTEMPTS) {
                const body: CreateSecretResponse = {
                    success: false,
                    error: `Invalid max attempts value (must be between ${MIN_MAX_ATTEMPTS} and ${MAX_ALLOWED_ATTEMPTS})`
                };
                return jsonResponse(body, 400);
            }

            maxAttempts = Math.min(Math.max(Math.floor(requested), MIN_MAX_ATTEMPTS), MAX_ALLOWED_ATTEMPTS);
        }

        const password = payload.password?.trim();
        const passwordHash = password ? hashPassword(password) : null;
        const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

        await dbConnect();

        const doc = await Secret.create({
            ciphertext,
            passwordHash,
            expiresAt,
            views: maxViews,
            attempts: 0,
            maxAttempts
        });

        const body: CreateSecretResponse = {
            success: true,
            data: {
                id: doc._id.toString(),
                expiresAt: expiresAt.toISOString()
            }
        };

        try {
            await Event.create({
                type: 'created',
                secretId: doc._id,
                hasPassword: !!passwordHash,
                expiresAt
            });
        } catch {
            // Event logging failure is non-fatal
        }

        return jsonResponse(body, 201);
    } catch (error) {
        console.error('[api/secrets POST]', error);
        const body: CreateSecretResponse = { success: false, error: 'Failed to create secret' };
        return jsonResponse(body, 500);
    }
}
