// src/app/api/stats/route.ts

import { NextRequest, NextResponse } from 'next/server';

import { runExpirySweep } from '@/libs/expiry-sweep';
import dbConnect from '@/libs/mongodb';
import { checkRateLimit, rateLimitResponse } from '@/libs/rate-limit';
import Event from '@/models/Event';
import Stats from '@/models/Stats';
import type { StatsHourlyPoint, StatsResponse, StatsTimeSeriesPoint } from '@/types';

function getMongoTimezone(now: Date): string {
    const offsetMinutes = -now.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absMin = Math.abs(offsetMinutes);
    const hours = Math.floor(absMin / 60);
    const minutes = absMin % 60;
    return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function formatLocalDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export async function GET(req: NextRequest) {
    try {
        const rl = await checkRateLimit(req);

        if (!rl.allowed) {
            return rateLimitResponse(rl);
        }

        await dbConnect();

        try {
            await runExpirySweep();
        } catch {
            // Sweep failure is non-fatal
        }

        const now = new Date();
        const timezone = getMongoTimezone(now);

        // 30-day boundary
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 29); // include today
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        const statsDoc = await Stats.findOne({ name: 'global' });

        const createdEvents = statsDoc?.totalCreated ?? 0;
        const consumedEvents = statsDoc?.totalConsumed ?? 0;
        const lockedEvents = statsDoc?.totalLocked ?? 0;
        const expiredEvents = statsDoc?.totalExpired ?? 0;
        const withPassword = statsDoc?.totalWithPassword ?? 0;
        const withoutPassword = statsDoc?.totalWithoutPassword ?? 0;

        // 30-day daily aggregation
        const dailyAgg = await Event.aggregate<{
            _id: { date: string; type: string };
            count: number;
        }>([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo },
                    type: { $in: ['created', 'consumed', 'locked'] }
                }
            },
            {
                $group: {
                    _id: {
                        date: {
                            $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone }
                        },
                        type: '$type'
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        // 30-day expired aggregation
        const dailyExpiredAgg = await Event.aggregate<{
            _id: { date: string };
            count: number;
        }>([
            {
                $match: {
                    type: 'expired',
                    expiresAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        date: {
                            $dateToString: { format: '%Y-%m-%d', date: '$expiresAt', timezone }
                        }
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        // 30-day map
        const dayMap = new Map<string, StatsTimeSeriesPoint>();

        for (let i = 29; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            d.setHours(0, 0, 0, 0);
            const key = formatLocalDate(d);
            dayMap.set(key, { date: key, created: 0, consumed: 0, locked: 0, expired: 0 });
        }

        for (const row of dailyAgg) {
            const point = dayMap.get(row._id.date);
            if (point) {
                if (row._id.type === 'created') point.created = row.count;
                else if (row._id.type === 'consumed') point.consumed = row.count;
                else if (row._id.type === 'locked') point.locked = row.count;
            }
        }

        for (const row of dailyExpiredAgg) {
            const point = dayMap.get(row._id.date);
            if (point) {
                point.expired = row.count;
            }
        }

        // Hourly aggregation for today
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);

        const hourlyAgg = await Event.aggregate<{
            _id: { hour: number; type: string };
            count: number;
        }>([
            {
                $match: {
                    createdAt: { $gte: startOfToday },
                    type: { $in: ['created', 'consumed', 'locked'] }
                }
            },
            {
                $group: {
                    _id: {
                        hour: { $hour: { date: '$createdAt', timezone } },
                        type: '$type'
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Hourly expired for today
        const endOfToday = new Date(now);
        endOfToday.setHours(23, 59, 59, 999);

        const hourlyExpiredAgg = await Event.aggregate<{
            _id: { hour: number };
            count: number;
        }>([
            {
                $match: {
                    type: 'expired',
                    expiresAt: { $gte: startOfToday, $lte: endOfToday }
                }
            },
            {
                $group: {
                    _id: {
                        hour: { $hour: { date: '$expiresAt', timezone } }
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        // 24-hour map
        const hourMap = new Map<number, StatsHourlyPoint>();

        for (let h = 0; h < 24; h++) {
            hourMap.set(h, { hour: h, created: 0, consumed: 0, locked: 0, expired: 0 });
        }

        for (const row of hourlyAgg) {
            const point = hourMap.get(row._id.hour);
            if (point) {
                if (row._id.type === 'created') point.created = row.count;
                else if (row._id.type === 'consumed') point.consumed = row.count;
                else if (row._id.type === 'locked') point.locked = row.count;
            }
        }

        for (const row of hourlyExpiredAgg) {
            const point = hourMap.get(row._id.hour);
            if (point) {
                point.expired = row.count;
            }
        }

        const body: StatsResponse = {
            success: true,
            data: {
                totals: {
                    created: createdEvents,
                    consumed: consumedEvents,
                    locked: lockedEvents,
                    expired: expiredEvents,
                    withPassword,
                    withoutPassword
                },
                timeSeries: Array.from(dayMap.values()),
                hourly: Array.from(hourMap.values())
            }
        };

        return NextResponse.json(body, {
            status: 200,
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
            }
        });
    } catch (error) {
        console.error('[api/stats GET]', error);
        const body: StatsResponse = { success: false, error: 'Failed to load stats' };
        return NextResponse.json(body, { status: 500 });
    }
}
