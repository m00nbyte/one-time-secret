// src/libs/expiry-sweep.ts

import Event from '@/models/Event';
import Secret from '@/models/Secret';

export async function runExpirySweep(): Promise<void> {
    const now = new Date();

    const expiredSecrets = await Secret.find({ expiresAt: { $lt: now } })
        .select('_id passwordHash expiresAt')
        .sort({ expiresAt: 1 })
        .lean();

    if (expiredSecrets.length === 0) {
        return;
    }

    try {
        await Event.create(
            expiredSecrets.map((s) => ({
                type: 'expired' as const,
                secretId: s._id,
                hasPassword: !!s.passwordHash,
                expiresAt: s.expiresAt
            }))
        );
    } catch {
        // Event creation failure is non-fatal
    }

    try {
        await Secret.deleteMany({
            _id: { $in: expiredSecrets.map((s) => s._id) }
        });
    } catch {
        // Deletion failure is non-fatal
    }
}
