// src/models/RateLimit.ts

import mongoose, { Document, Schema } from 'mongoose';

export interface IRateLimit extends Document {
    key: string;
    count: number;
    windowStart: number;
    lockedUntil: number | null;
    createdAt: Date;
    updatedAt: Date;
}

const RateLimitSchema = new Schema<IRateLimit>(
    {
        key: {
            type: String,
            required: true,
            unique: true
        },
        count: {
            type: Number,
            default: 0
        },
        windowStart: {
            type: Number,
            default: () => Date.now()
        },
        lockedUntil: {
            type: Number,
            default: null
        }
    },
    {
        timestamps: true
    }
);

RateLimitSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 });

export default mongoose.models.RateLimit || mongoose.model<IRateLimit>('RateLimit', RateLimitSchema);
