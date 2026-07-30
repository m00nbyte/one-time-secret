// src/app/stats/page.tsx

'use client';

import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import BusiestDayCard from '@/components/BusiestDayCard';
import RatioCard from '@/components/RatioCard';
import StatCard from '@/components/StatCard';
import StatChart, { formatDateLabel, formatHourLabel } from '@/components/StatChart';
import type { StatItem, StatsHourlyPoint, StatsResponse, StatsTimeSeriesPoint } from '@/types';

const REFRESH_INTERVAL_MS = 60_000;

function formatLocalToday(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
};

const statVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } }
};

function StatsPage() {
    const [data, setData] = useState<StatsResponse['data'] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch('/api/stats', { cache: 'no-store' });
            const body = (await res.json()) as StatsResponse;
            if (body.success && body.data) {
                setData(body.data);
                setError(null);
            } else {
                setError(body.error || 'Failed to load statistics');
            }
        } catch {
            setError('Failed to load statistics');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();

        timerRef.current = setInterval(fetchStats, REFRESH_INTERVAL_MS);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [fetchStats]);

    const t = data?.totals;
    const consumptionRate = t && t.created > 0 ? (t.consumed / t.created) * 100 : 0;
    const passphraseRate = t && t.created > 0 ? (t.withPassword / t.created) * 100 : 0;
    const expirationRate = t && t.created > 0 ? (t.expired / t.created) * 100 : 0;
    const lockRate = t && t.created > 0 ? (t.locked / t.created) * 100 : 0;

    const hourly = data?.hourly ?? [];

    const todayTotals = hourly.reduce(
        (acc, h) => ({
            created: acc.created + h.created,
            consumed: acc.consumed + h.consumed,
            expired: acc.expired + h.expired,
            locked: acc.locked + h.locked
        }),
        { created: 0, consumed: 0, expired: 0, locked: 0 }
    );

    const peakHour = hourly.reduce(
        (best, h) => {
            const total = h.created + h.consumed + h.expired + h.locked;
            return total > best.total ? { hour: h.hour, total } : best;
        },
        { hour: 0, total: 0 }
    );

    const todayStats: StatItem[] = [
        {
            icon: 'icon-[solar--database-bold]',
            value: todayTotals.created,
            label: 'Created today',
            accent: 'bg-sky-100 text-sky-600',
            color: 'text-sky-600',
            description: 'New secrets created since midnight.'
        },
        {
            icon: 'icon-[solar--eye-scan-bold]',
            value: todayTotals.consumed,
            label: 'Consumed today',
            accent: 'bg-green-100 text-green-600',
            color: 'text-green-600',
            description: 'Secrets viewed since midnight.'
        },
        {
            icon: 'icon-[solar--clock-circle-bold]',
            value: todayTotals.expired,
            label: 'Expired today',
            accent: 'bg-amber-100 text-amber-600',
            color: 'text-amber-600',
            description: 'Secrets that timed out today.'
        },
        {
            icon: 'icon-[solar--lock-keyhole-bold]',
            value: todayTotals.locked,
            label: 'Locked today',
            accent: 'bg-red-100 text-red-600',
            color: 'text-red-600',
            description: 'Secrets locked from failed attempts.'
        }
    ];

    return (
        <div className="container mx-auto bg-stone-50 text-stone-900 p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-center justify-center py-20"
                        >
                            <span className="icon-[svg-spinners--ring-resize] text-3xl text-sky-500"></span>
                        </motion.div>
                    ) : error ? (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center text-rose-600"
                        >
                            <span className="icon-[solar--danger-triangle-bold] text-3xl block mb-2"></span>
                            {error}
                        </motion.div>
                    ) : data ? (
                        <motion.div key="content" variants={containerVariants} initial="hidden" animate="visible">
                            <motion.section variants={statVariants}>
                                <div className="py-10">
                                    <div className="flex flex-col md:flex-row items-center gap-6 mb-8 md:mb-10">
                                        <div className="flex-1 text-center md:text-left">
                                            <h2 className="text-xl md:text-2xl font-bold text-stone-800 leading-tight mb-2">
                                                All-time totals
                                            </h2>
                                            <p className="text-base text-stone-500">
                                                Cumulative breakdown of every secret, grouped by lifecycle stage.
                                            </p>
                                        </div>
                                    </div>
                                    <motion.div
                                        variants={containerVariants}
                                        className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-stone-200 rounded-2xl overflow-hidden"
                                    >
                                        <StatCard
                                            icon="icon-[solar--database-bold]"
                                            value={data.totals.created}
                                            label="Total created"
                                            accent="bg-sky-100 text-sky-600"
                                            color="text-sky-600"
                                            description="All secrets created since launch."
                                        />
                                        <StatCard
                                            icon="icon-[solar--key-bold]"
                                            value={data.totals.withPassword}
                                            label="With passphrase"
                                            accent="bg-sky-100 text-sky-600"
                                            color="text-sky-600"
                                            description="Secrets protected with a passphrase."
                                        />
                                        <StatCard
                                            icon="icon-[solar--eye-bold]"
                                            value={data.totals.withoutPassword}
                                            label="Without passphrase"
                                            accent="bg-sky-100 text-sky-600"
                                            color="text-sky-600"
                                            description="Secrets shared without a passphrase."
                                        />
                                        <RatioCard
                                            icon="icon-[solar--key-bold]"
                                            value={passphraseRate}
                                            label="Passphrase adoption"
                                            description="Share of secrets protected with a passphrase."
                                            accent="bg-sky-100 text-sky-600"
                                            color="text-sky-600"
                                        />
                                        <StatCard
                                            icon="icon-[solar--eye-scan-bold]"
                                            value={data.totals.consumed}
                                            label="Consumed"
                                            accent="bg-green-100 text-green-600"
                                            color="text-green-600"
                                            description="Secrets viewed at least once."
                                        />
                                        <RatioCard
                                            icon="icon-[solar--eye-scan-bold]"
                                            value={consumptionRate}
                                            label="Consumption rate"
                                            description="Share of created secrets that were viewed."
                                            accent="bg-green-100 text-green-600"
                                            color="text-green-600"
                                        />
                                        <StatCard
                                            icon="icon-[solar--clock-circle-bold]"
                                            value={data.totals.expired}
                                            label="Expired"
                                            accent="bg-amber-100 text-amber-600"
                                            color="text-amber-600"
                                            description="Secrets that reached their time limit."
                                        />
                                        <RatioCard
                                            icon="icon-[solar--clock-circle-bold]"
                                            value={expirationRate}
                                            label="Expiration rate"
                                            description="Share of secrets that reached their time limit."
                                            accent="bg-amber-100 text-amber-600"
                                            color="text-amber-600"
                                        />
                                        <StatCard
                                            icon="icon-[solar--lock-keyhole-bold]"
                                            value={data.totals.locked}
                                            label="Locked"
                                            accent="bg-red-100 text-red-600"
                                            color="text-red-600"
                                            description="Secrets locked after too many failed attempts."
                                        />
                                        <RatioCard
                                            icon="icon-[solar--lock-keyhole-bold]"
                                            value={lockRate}
                                            label="Lock rate"
                                            description="Share of secrets locked after too many attempts."
                                            accent="bg-red-100 text-red-600"
                                            color="text-red-600"
                                        />
                                    </motion.div>
                                </div>
                            </motion.section>

                            <div className="py-10">
                                <div className="flex flex-col md:flex-row items-center gap-6 mb-8 md:mb-10">
                                    <div className="flex-1 text-center md:text-left">
                                        <h2 className="text-xl md:text-2xl font-bold text-stone-800 leading-tight mb-2">
                                            Today at a glance
                                        </h2>
                                        <p className="text-base text-stone-500">
                                            A quick snapshot of everything that happened since midnight.
                                        </p>
                                    </div>
                                </div>
                                <motion.div
                                    variants={containerVariants}
                                    className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-stone-200 rounded-2xl overflow-hidden"
                                >
                                    {todayStats.map((stat) => (
                                        <StatCard key={stat.label} {...stat} />
                                    ))}
                                </motion.div>

                                {data.busiestDay?.date && data.busiestDay.totalEvents > 0 && (
                                    <BusiestDayCard
                                        date={formatDateLabel(data.busiestDay.date)}
                                        totalEvents={data.busiestDay.totalEvents}
                                        peakHourLabel={
                                            data.busiestDay.date === formatLocalToday()
                                                ? formatHourLabel(peakHour.hour)
                                                : data.busiestDay.peakHour !== null && data.busiestDay.peakHour !== undefined
                                                  ? formatHourLabel(data.busiestDay.peakHour)
                                                  : '—'
                                        }
                                        isToday={data.busiestDay.date === formatLocalToday()}
                                    />
                                )}
                            </div>

                            <div className="py-10">
                                <div className="flex flex-col md:flex-row items-center gap-6 mb-8 md:mb-10">
                                    <div className="flex-1 text-center md:text-left">
                                        <h2 className="text-xl md:text-2xl font-bold text-stone-800 leading-tight mb-2">
                                            Last 30 days
                                        </h2>
                                        <p className="text-base text-stone-500">
                                            Daily breakdown of secret activity over the past 30 days.
                                        </p>
                                    </div>
                                </div>
                                {data.timeSeries && (
                                    <StatChart
                                        points={data.timeSeries as (StatsTimeSeriesPoint | StatsHourlyPoint)[]}
                                        labelFn={(p) => formatDateLabel((p as StatsTimeSeriesPoint).date)}
                                    />
                                )}
                            </div>

                            <div className="py-10">
                                <div className="flex flex-col md:flex-row items-center gap-6 mb-8 md:mb-10">
                                    <div className="flex-1 text-center md:text-left">
                                        <h2 className="text-xl md:text-2xl font-bold text-stone-800 leading-tight mb-2">
                                            Last 24 hours
                                        </h2>
                                        <p className="text-base text-stone-500">
                                            Hourly breakdown of secret activity since midnight.
                                        </p>
                                    </div>
                                </div>
                                {data.hourly && (
                                    <StatChart
                                        points={data.hourly as (StatsTimeSeriesPoint | StatsHourlyPoint)[]}
                                        labelFn={(p) => formatHourLabel((p as StatsHourlyPoint).hour)}
                                    />
                                )}
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.2, ease: 'easeOut' }}
                    className="text-center mt-5"
                >
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100 hover:border-sky-300 transition-colors"
                    >
                        <span className="icon-[solar--alt-arrow-left-bold] text-sky-500"></span>
                        Back to home
                    </Link>
                </motion.div>
            </div>
        </div>
    );
}

export default StatsPage;
