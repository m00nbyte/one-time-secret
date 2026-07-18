// src/app/api/secrets/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';

import { verifyPassword } from '@/libs/crypto';
import { DEFAULT_MAX_ATTEMPTS } from '@/libs/limits';
import dbConnect from '@/libs/mongodb';
import { checkRateLimit, rateLimitResponse } from '@/libs/rate-limit';
import Event from '@/models/Event';
import Secret from '@/models/Secret';
import type { RevealSecretRequest, RevealSecretResponse, SecretMetaResponse } from '@/types';

function jsonResponse<T>(body: T, status = 200) {
    return NextResponse.json(body, { status });
}

function isValidObjectId(id: string): boolean {
    return /^[a-f\d]{24}$/i.test(id);
}

type LeanMeta = {
    passwordHash: string | null;
    expiresAt: Date;
    views: number;
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const rl = await checkRateLimit(_req);

        if (!rl.allowed) {
            return rateLimitResponse(rl);
        }

        const { id } = await params;

        if (!isValidObjectId(id)) {
            const body: SecretMetaResponse = { success: false, error: 'Invalid link' };
            return jsonResponse(body, 400);
        }

        await dbConnect();

        const doc = (await Secret.findById(id).select('passwordHash expiresAt views').lean()) as LeanMeta | null;

        if (!doc) {
            const body: SecretMetaResponse = {
                success: false,
                error: 'This secret does not exist, has already been viewed, or has expired.'
            };
            return jsonResponse(body, 404);
        }

        const now = new Date();
        const expired = doc.expiresAt.getTime() <= now.getTime();

        const data = {
            requiresPassword: !!doc.passwordHash,
            expiresAt: doc.expiresAt.toISOString(),
            remainingViews: doc.views,
            expired
        };

        const body: SecretMetaResponse = { success: true, data };
        return jsonResponse(body, 200);
    } catch (error) {
        console.error('[api/secrets/[id] GET]', error);
        const body: SecretMetaResponse = { success: false, error: 'Failed to load secret' };
        return jsonResponse(body, 500);
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const rl = await checkRateLimit(req);

        if (!rl.allowed) {
            return rateLimitResponse(rl);
        }

        const { id } = await params;

        if (!isValidObjectId(id)) {
            const body: RevealSecretResponse = { success: false, error: 'Invalid link' };
            return jsonResponse(body, 400);
        }

        let payload: RevealSecretRequest = {};

        try {
            payload = (await req.json()) as RevealSecretRequest;
        } catch {
            payload = {};
        }

        await dbConnect();

        const existing = await Secret.findById(id).select('attempts expiresAt views passwordHash maxAttempts');

        if (!existing) {
            const body: RevealSecretResponse = {
                success: false,
                error: 'This secret does not exist, has already been viewed, or has expired.'
            };
            return jsonResponse(body, 404);
        }

        if (existing.expiresAt.getTime() <= Date.now()) {
            const body: RevealSecretResponse = { success: false, error: 'This secret has expired.' };
            return jsonResponse(body, 410);
        }

        if (existing.views <= 0) {
            const body: RevealSecretResponse = { success: false, error: 'This secret has no views remaining.' };
            return jsonResponse(body, 410);
        }

        const maxAttempts = existing.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

        if (existing.attempts >= maxAttempts) {
            const body: RevealSecretResponse = {
                success: false,
                error: 'Too many failed attempts. This secret has been locked.'
            };
            return jsonResponse(body, 429);
        }

        if (existing.passwordHash) {
            const candidate = payload?.password ?? '';

            if (!candidate || !verifyPassword(candidate, existing.passwordHash)) {
                const updated = await Secret.findByIdAndUpdate({ _id: id }, { $inc: { attempts: 1 } }, { new: true }).select(
                    'attempts maxAttempts'
                );

                if (updated && updated.attempts >= (updated.maxAttempts ?? maxAttempts)) {
                    try {
                        await Event.create({
                            type: 'locked',
                            secretId: updated._id,
                            hasPassword: true,
                            expiresAt: existing.expiresAt
                        });
                    } catch {
                        // Event logging failure is non-fatal
                    }
                }

                const body: RevealSecretResponse = { success: false, error: 'Incorrect password.' };
                return jsonResponse(body, 401);
            }
        }

        const claimed = await Secret.findOneAndUpdate(
            { _id: id, views: { $gt: 0 } },
            { $inc: { views: -1 } },
            { new: true }
        ).select('ciphertext expiresAt views');

        if (!claimed) {
            const body: RevealSecretResponse = {
                success: false,
                error: 'This secret has no views remaining.'
            };
            return jsonResponse(body, 410);
        }

        if (claimed.views <= 0) {
            await Secret.deleteOne({ _id: claimed._id });
        }

        try {
            await Event.create({
                type: 'consumed',
                secretId: claimed._id,
                hasPassword: !!existing.passwordHash,
                expiresAt: claimed.expiresAt
            });
        } catch {
            // Event logging failure is non-fatal
        }

        const body: RevealSecretResponse = {
            success: true,
            data: {
                ciphertext: claimed.ciphertext,
                expiresAt: claimed.expiresAt.toISOString(),
                remainingViews: claimed.views
            }
        };
        return jsonResponse(body, 200);
    } catch (error) {
        console.error('[api/secrets/[id] POST]', error);
        const body: RevealSecretResponse = { success: false, error: 'Failed to reveal secret' };
        return jsonResponse(body, 500);
    }
}
