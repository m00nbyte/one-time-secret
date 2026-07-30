// src/models/Stats.ts

import mongoose, { Document, Schema } from 'mongoose';

export interface IBusiestDay {
    date: Date;
    totalEvents: number;
    peakHour: number;
}

export interface IStats extends Document {
    name: string;
    totalCreated: number;
    totalConsumed: number;
    totalLocked: number;
    totalExpired: number;
    totalWithPassword: number;
    totalWithoutPassword: number;
    busiestDay: IBusiestDay;
    createdAt: Date;
    updatedAt: Date;
}

const StatsSchema = new Schema<IStats>(
    {
        name: {
            type: String,
            required: true,
            default: 'global',
            unique: true
        },
        totalCreated: {
            type: Number,
            default: 0
        },
        totalConsumed: {
            type: Number,
            default: 0
        },
        totalLocked: {
            type: Number,
            default: 0
        },
        totalExpired: {
            type: Number,
            default: 0
        },
        totalWithPassword: {
            type: Number,
            default: 0
        },
        totalWithoutPassword: {
            type: Number,
            default: 0
        },
        busiestDay: {
            date: {
                type: Date,
                default: null
            },
            totalEvents: {
                type: Number,
                default: 0
            },
            peakHour: {
                type: Number,
                default: 0
            }
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.models.Stats || mongoose.model<IStats>('Stats', StatsSchema);
