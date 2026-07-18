// src/libs/rate-limit.ts

import { NextRequest, NextResponse } from 'next/server';

import { RATE_LIMIT_LOCKOUT_SECONDS, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SECONDS } from '@/libs/limits';
import dbConnect from '@/libs/mongodb';
import RateLimit from '@/models/RateLimit';

const WINDOW_MS = RATE_LIMIT_WINDOW_SECONDS * 1000;
const LOCKOUT_MS = RATE_LIMIT_LOCKOUT_SECONDS * 1000;

export interface RateLimitResult {
    allowed: boolean;
    statusCode: 429;
    retryAfter: number;
    remaining: number;
    reason: string;
}

async function getClientKey(req: NextRequest): Promise<string> {
    const xff = req.headers.get('x-forwarded-for');
    const rawIp = (xff?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown').trim();

    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawIp));
    return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

export async function checkRateLimit(req: NextRequest): Promise<RateLimitResult> {
    await dbConnect();

    const key = await getClientKey(req);
    const now = Date.now();
    const lockUntil = now + LOCKOUT_MS;

    const notLocked = { $or: [{ lockedUntil: null }, { lockedUntil: { $lte: now } }] };

    await RateLimit.findOneAndUpdate(
        { key },
        {
            $setOnInsert: { windowStart: now, count: 0, lockedUntil: null },
            $set: { updatedAt: new Date(now) }
        },
        { upsert: true }
    );

    await RateLimit.updateOne({ key, windowStart: { $lt: now - WINDOW_MS } }, { $set: { windowStart: now, count: 0 } });

    const updated = await RateLimit.findOneAndUpdate(
        { key, ...notLocked, count: { $lt: RATE_LIMIT_MAX } },
        { $inc: { count: 1 }, $set: { updatedAt: new Date(now) } },
        { new: true }
    );

    if (updated) {
        return {
            allowed: true,
            statusCode: 429,
            retryAfter: 0,
            remaining: Math.max(RATE_LIMIT_MAX - updated.count, 0),
            reason: ''
        };
    }

    await RateLimit.updateOne({ key, ...notLocked, count: { $gte: RATE_LIMIT_MAX } }, { $set: { lockedUntil: lockUntil } });

    const current = await RateLimit.findOne({ key }).select('lockedUntil').lean<{ lockedUntil: number | null }>();
    const retryAfter =
        current?.lockedUntil && current.lockedUntil > now
            ? Math.ceil((current.lockedUntil - now) / 1000)
            : RATE_LIMIT_LOCKOUT_SECONDS;

    return blocked(retryAfter, 'Rate limit exceeded. Please try again later.');
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
    return NextResponse.json(
        { success: false, error: result.reason },
        {
            status: 429,
            headers: {
                'Retry-After': String(result.retryAfter),
                'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
                'X-RateLimit-Remaining': '0'
            }
        }
    );
}

function blocked(retryAfterSeconds: number, reason: string): RateLimitResult {
    return {
        allowed: false,
        statusCode: 429,
        retryAfter: retryAfterSeconds,
        remaining: 0,
        reason
    };
}
