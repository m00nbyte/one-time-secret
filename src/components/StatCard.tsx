// src/components/StatCard.tsx

'use client';

import { motion } from 'motion/react';

import { StatItem } from '@/types';

interface StatCardProps extends StatItem {
    compact?: boolean;
}

const statVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } }
};

const StatCard = ({ icon, value, label, accent, color, description, compact }: StatCardProps) => {
    const displayValue = typeof value === 'number' ? value.toLocaleString() : value;

    if (compact) {
        return (
            <motion.div variants={statVariants} className="flex items-center justify-center gap-4 p-5 md:p-6 bg-stone-50">
                <div className="min-w-0 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">{label}</p>
                    <p className={`text-2xl md:text-3xl font-bold tabular-nums leading-none ${color}`}>{displayValue}</p>
                    {description && <p className="text-xs md:text-sm text-stone-500 mt-1.5 leading-snug">{description}</p>}
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div variants={statVariants} className="flex items-center gap-4 p-5 md:p-6 bg-stone-50">
            <div
                className={`flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-xl ${accent} transition-transform duration-300`}
            >
                <span className={`${icon} text-lg md:text-xl`}></span>
            </div>
            <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">{label}</p>
                <p className={`text-2xl md:text-3xl font-bold tabular-nums leading-none ${color}`}>{displayValue}</p>
                {description && <p className="text-xs md:text-sm text-stone-500 mt-1.5 leading-snug">{description}</p>}
            </div>
        </motion.div>
    );
};

export default StatCard;
