// src/components/RatioCard.tsx

'use client';

import { motion } from 'motion/react';

interface RatioCardProps {
    icon: string;
    value: number; // 0–100
    label: string;
    description: string;
    accent: string;
    color: string;
}

const statVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } }
};

const RADIUS = 28;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatPercent(value: number): string {
    if (value <= 0) return '0%';
    if (value < 1) return '<1%';
    if (Number.isInteger(value)) return `${value}%`;
    return `${value.toFixed(1)}%`;
}

const RatioCard = ({ icon, value, label, description, accent, color }: RatioCardProps) => {
    const clamped = Math.max(0, Math.min(100, value));
    const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;

    return (
        <motion.div variants={statVariants} className="flex items-center gap-4 p-5 md:p-6 bg-stone-50">
            <div
                className={`relative flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center ${accent} rounded-full`}
            >
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64">
                    <circle
                        cx="32"
                        cy="32"
                        r={RADIUS}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="5"
                        className="opacity-15"
                    />
                    <motion.circle
                        cx="32"
                        cy="32"
                        r={RADIUS}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={CIRCUMFERENCE}
                        initial={{ strokeDashoffset: CIRCUMFERENCE }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                </svg>
                <span className={`${icon} text-base md:text-lg ${color}`}></span>
            </div>
            <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">{label}</p>
                <p className={`text-2xl md:text-3xl font-bold tabular-nums leading-none ${color}`}>{formatPercent(clamped)}</p>
                <p className="text-xs md:text-sm text-stone-500 mt-1.5 leading-snug">{description}</p>
            </div>
        </motion.div>
    );
};

export default RatioCard;
