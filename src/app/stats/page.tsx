// src/app/stats/page.tsx

'use client';

import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatChart, { formatDateLabel, formatHourLabel } from '@/components/StatChart';
import StatSection from '@/components/StatSection';
import type { StatItem, StatsHourlyPoint, StatsResponse, StatsTimeSeriesPoint } from '@/types';

const REFRESH_INTERVAL_MS = 60_000;

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

    const totalStats: StatItem[] = data
        ? [
              {
                  icon: 'icon-[solar--database-bold]',
                  value: data.totals.created,
                  label: 'Total created',
                  accent: 'bg-sky-100 text-sky-600',
                  color: 'text-sky-600',
                  description: 'All secrets created since launch.'
              },
              {
                  icon: 'icon-[solar--key-bold]',
                  value: data.totals.withPassword,
                  label: 'With passphrase',
                  accent: 'bg-sky-100 text-sky-600',
                  color: 'text-sky-600',
                  description: 'Secrets protected with a passphrase.'
              },
              {
                  icon: 'icon-[solar--eye-bold]',
                  value: data.totals.withoutPassword,
                  label: 'Without passphrase',
                  accent: 'bg-sky-100 text-sky-600',
                  color: 'text-sky-600',
                  description: 'Secrets shared without a passphrase.'
              },
              {
                  icon: 'icon-[solar--eye-scan-bold]',
                  value: data.totals.consumed,
                  label: 'Consumed',
                  accent: 'bg-green-100 text-green-600',
                  color: 'text-green-600',
                  description: 'Secrets viewed at least once.'
              },
              {
                  icon: 'icon-[solar--clock-circle-bold]',
                  value: data.totals.expired,
                  label: 'Expired',
                  accent: 'bg-amber-100 text-amber-600',
                  color: 'text-amber-600',
                  description: 'Secrets that reached their time limit.'
              },
              {
                  icon: 'icon-[solar--lock-keyhole-bold]',
                  value: data.totals.locked,
                  label: 'Locked',
                  accent: 'bg-red-100 text-red-600',
                  color: 'text-red-600',
                  description: 'Secrets locked after too many failed attempts.'
              }
          ]
        : [];

    return (
        <div className="container mx-auto bg-stone-50 text-stone-900 p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                <PageHeader
                    icon="icon-[mdi--encryption-expiration]"
                    title="One Time Secret"
                    text="Share sensitive messages that self-destruct after being read once."
                />

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
                            <motion.section variants={statVariants} className="border-b border-stone-200">
                                <StatSection
                                    title="All-time totals"
                                    description="Cumulative counts of every action since the service launched."
                                >
                                    <motion.div
                                        variants={containerVariants}
                                        className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-stone-200 rounded-2xl overflow-hidden"
                                    >
                                        {totalStats.map((stat) => (
                                            <StatCard key={stat.label} {...stat} />
                                        ))}
                                    </motion.div>
                                </StatSection>
                            </motion.section>

                            <StatSection
                                title="Last 30 days"
                                description="Daily breakdown of secret activity over the past 30 days."
                            >
                                {data.timeSeries && (
                                    <StatChart
                                        points={data.timeSeries as (StatsTimeSeriesPoint | StatsHourlyPoint)[]}
                                        labelFn={(p) => formatDateLabel((p as StatsTimeSeriesPoint).date)}
                                    />
                                )}
                            </StatSection>

                            <StatSection
                                title={'Last 24 hours'}
                                description="Hourly breakdown of secret activity since midnight."
                            >
                                {data.hourly && (
                                    <StatChart
                                        points={data.hourly as (StatsTimeSeriesPoint | StatsHourlyPoint)[]}
                                        labelFn={(p) => formatHourLabel((p as StatsHourlyPoint).hour)}
                                    />
                                )}
                            </StatSection>
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
