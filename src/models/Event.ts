// src/models/Event.ts

import mongoose, { Document, Schema } from 'mongoose';

export type EventType = 'created' | 'consumed' | 'locked' | 'expired';

export interface IEvent extends Document {
    type: EventType;
    secretId: mongoose.Types.ObjectId;
    hasPassword: boolean;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
    {
        type: {
            type: String,
            required: true,
            enum: ['created', 'consumed', 'locked', 'expired'],
            index: true
        },
        secretId: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true
        },
        hasPassword: {
            type: Boolean,
            default: false
        },
        expiresAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

EventSchema.index({ type: 1, createdAt: 1 });
EventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31 * 24 * 60 * 60 });

/**
 * Auto-increment the Stats counters whenever a new event is saved.
 * This keeps the Stats document in sync without manual updates in API routes.
 */
EventSchema.post('save', async function (this: IEvent) {
    try {
        // Lazy import to avoid circular dependency at module load time
        const Stats = (await import('@/models/Stats')).default;

        const inc: Record<string, number> = {};

        if (this.type === 'created') {
            inc.totalCreated = 1;
            inc[this.hasPassword ? 'totalWithPassword' : 'totalWithoutPassword'] = 1;
        } else if (this.type === 'consumed') {
            inc.totalConsumed = 1;
        } else if (this.type === 'locked') {
            inc.totalLocked = 1;
        } else if (this.type === 'expired') {
            inc.totalExpired = 1;
        }

        if (Object.keys(inc).length > 0) {
            try {
                await Stats.findOneAndUpdate({ name: 'global' }, { $inc: inc }, { upsert: true });
            } catch (err) {
                // Race condition: two events tried to upsert the 'global' doc at
                // the same time, causing a duplicate-key error (11000). Retry
                // without upsert — by now the document must exist.
                const mongoErr = err as { name?: string; code?: number };
                if (mongoErr?.name === 'MongoServerError' && mongoErr?.code === 11000) {
                    await Stats.updateOne({ name: 'global' }, { $inc: inc });
                } else {
                    throw err;
                }
            }
        }
    } catch {
        // Stats update failure is non-fatal
    }
});

export default mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);
