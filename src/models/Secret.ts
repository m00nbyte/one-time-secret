// src/models/Secret.ts

import mongoose, { Document, Schema } from 'mongoose';

export interface ISecret extends Document {
    ciphertext: string;
    passwordHash?: string;
    expiresAt: Date;
    views: number;
    attempts: number;
    maxAttempts: number;
    createdAt: Date;
    updatedAt: Date;
}

const SecretSchema = new Schema<ISecret>(
    {
        ciphertext: {
            type: String,
            required: true
        },
        passwordHash: {
            type: String,
            default: null
        },
        expiresAt: {
            type: Date,
            required: true
        },
        views: {
            type: Number,
            required: true,
            min: 0
        },
        attempts: {
            type: Number,
            default: 0
        },
        maxAttempts: {
            type: Number,
            required: true,
            min: 1,
            max: 1000
        }
    },
    {
        timestamps: true
    }
);

SecretSchema.index({ expiresAt: 1 });

export default mongoose.models.Secret || mongoose.model<ISecret>('Secret', SecretSchema);
