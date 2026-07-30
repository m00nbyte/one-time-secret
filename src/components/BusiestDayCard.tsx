// src/components/BusiestDayCard.tsx

'use client';

import { motion } from 'motion/react';

interface BusiestDayCardProps {
    date: string;
    totalEvents: number;
    peakHourLabel: string;
    isToday: boolean;
}

const statVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } }
};

const BusiestDayCard = ({ date, totalEvents, peakHourLabel, isToday }: BusiestDayCardProps) => {
    return (
        <motion.div
            variants={statVariants}
            className="relative overflow-hidden rounded-2xl p-6 md:p-8 border border-stone-200 bg-stone-100"
        >
            <div className="relative flex flex-col items-center gap-4 text-center md:flex-row md:items-center md:justify-between md:text-left">
                <div className="flex flex-col items-center gap-2 md:flex-row md:gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
                        <span className="icon-[solar--calendar-bold] text-2xl text-stone-400"></span>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                            Busiest day {isToday ? '' : '(all-time)'}
                        </p>
                        <p className="text-2xl md:text-3xl font-bold leading-tight mt-0.5">{date}</p>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-6 md:gap-8 md:justify-start">
                    <div className="flex items-center gap-2">
                        <span className="icon-[solar--clock-circle-bold] text-xl text-stone-400"></span>
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-wider text-stone-400">Peak hour</p>
                            <p className="text-lg font-bold">{peakHourLabel}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="icon-[solar--graph-up-bold] text-xl text-stone-400"></span>
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-wider text-stone-400">Events</p>
                            <p className="text-lg font-bold">{totalEvents.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default BusiestDayCard;
