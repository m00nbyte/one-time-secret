// src/components/PageHeader.tsx

'use client';

import { motion } from 'motion/react';

const PageHeader = ({ icon, title, text }: { icon: string; title: string; text?: string }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="mt-8 text-center"
        >
            <div className="flex items-center justify-center gap-3 mb-3">
                <span className={`${icon} text-4xl text-sky-700`}></span>
                <h1 className="text-4xl font-bold">{title}</h1>
            </div>
            {text && <p className="text-stone-500">{text}</p>}
        </motion.div>
    );
};

export default PageHeader;
