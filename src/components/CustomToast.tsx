// src/components/CustomToast.tsx

'use client';

import { AnimatePresence, motion } from 'motion/react';

interface CustomToastProps {
    visible: boolean;
    message: string;
}

const CustomToast = ({ visible, message }: CustomToastProps) => {
    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 16, x: '-50%' }}
                    animate={{ opacity: 1, y: 0, x: '-50%' }}
                    exit={{ opacity: 0, y: 16, x: '-50%' }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="fixed bottom-6 left-1/2 z-50"
                    role="status"
                    aria-live="polite"
                >
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 text-white rounded-lg shadow-lg text-sm font-medium">
                        <span className="icon-[solar--clipboard-check-bold]"></span>
                        {message}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CustomToast;
