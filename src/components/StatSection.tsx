// src/components/StatSection.tsx

'use client';

import { motion } from 'motion/react';
import { type ReactNode } from 'react';

interface StatSectionProps {
    title: ReactNode;
    description: string;
    children: ReactNode;
}

const statVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } }
};

const StatSection = ({ title, description, children }: StatSectionProps) => {
    return (
        <motion.section variants={statVariants} className="border-b border-stone-200">
            <div className="py-10">
                <div className="flex flex-col md:flex-row items-center gap-6 mb-8 md:mb-10">
                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-xl md:text-2xl font-bold text-stone-800 leading-tight mb-2">{title}</h2>
                        <p className="text-base text-stone-500">{description}</p>
                    </div>
                </div>
                <div>{children}</div>
            </div>
        </motion.section>
    );
};

export default StatSection;
