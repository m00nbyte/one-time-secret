// src/app/page.tsx

'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import CustomToast from '@/components/CustomToast';
import FeatureCards from '@/components/FeatureCards';
import PageHeader from '@/components/PageHeader';
import SecretForm, { type CreatedSecret } from '@/components/SecretForm';
import SecretResult from '@/components/SecretResult';
import UseCases from '@/components/UseCases';

function Home() {
    const [result, setResult] = useState<CreatedSecret | null>(null);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('Link copied to clipboard');

    useEffect(() => {
        if (!toastVisible) return;
        const timer = setTimeout(() => setToastVisible(false), 2500);
        return () => clearTimeout(timer);
    }, [toastVisible]);

    function showToast(message = 'Link copied to clipboard') {
        setToastMessage(message);
        setToastVisible(true);
    }

    function handleCreated(secret: CreatedSecret) {
        setResult(secret);
    }

    function resetForm() {
        setResult(null);
    }

    return (
        <div className="container mx-auto bg-stone-50 text-stone-900 p-4 md:p-6">
            <div className="max-w-4xl mx-auto flex flex-col gap-6">
                <PageHeader
                    icon="icon-[mdi--encryption-expiration]"
                    title="One Time Secret"
                    text="Share sensitive messages that self-destruct after being read once."
                />

                {result ? (
                    <SecretResult
                        url={result.url}
                        expiresAt={result.expiresAt}
                        maxViews={result.maxViews}
                        passwordProtected={result.passwordProtected}
                        qrDataUrl={result.qrDataUrl}
                        onToast={showToast}
                        onReset={resetForm}
                    />
                ) : (
                    <SecretForm onCreated={handleCreated} onToast={showToast} />
                )}

                {!result && (
                    <>
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 0.1, ease: 'easeOut' }}
                        >
                            <FeatureCards />
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 0.15, ease: 'easeOut' }}
                        >
                            <UseCases />
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 0.2, ease: 'easeOut' }}
                            className="mt-8 text-center"
                        >
                            <Link
                                href="/stats"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100 hover:border-sky-300 transition-colors"
                            >
                                <span className="icon-[solar--chart-square-bold] text-sky-500"></span>
                                View site metrics
                            </Link>
                        </motion.div>
                    </>
                )}
            </div>

            <CustomToast visible={toastVisible} message={toastMessage} />
        </div>
    );
}

export default Home;
