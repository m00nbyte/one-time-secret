// src/components/SecretResult.tsx

'use client';

import { motion } from 'motion/react';
import Image from 'next/image';
import { useMemo } from 'react';

import { formatDateTime, formatRelativeFromNow } from '@/libs/datetime';

interface SecretResultProps {
    url: string;
    expiresAt: string;
    maxViews: number;
    passwordProtected: boolean;
    qrDataUrl: string | null;
    onToast: (message: string) => void;
    onReset: () => void;
}

const SecretResult = ({ url, expiresAt, maxViews, passwordProtected, qrDataUrl, onToast, onReset }: SecretResultProps) => {
    const urlParts = useMemo(() => {
        if (!url) return null;
        try {
            const parsed = new URL(url);
            const origin = parsed.origin;
            const rest = url.substring(origin.length);
            return { origin, rest };
        } catch {
            return null;
        }
    }, [url]);

    function handleUrlClick() {
        if (!url) return;

        navigator.clipboard.writeText(url).then(() => onToast('Link copied to clipboard'));
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
        >
            <div className="bg-white border border-sky-200 rounded-xl p-6 mb-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <span className="icon-[solar--check-circle-bold] text-3xl text-sky-600"></span>
                    <h2 className="text-xl font-bold">Secret created!</h2>
                </div>

                <div className="flex flex-col sm:flex-row gap-5">
                    {qrDataUrl && (
                        <div className="flex flex-col items-center sm:items-start shrink-0">
                            <div className="p-2 bg-white border border-stone-200 rounded-lg">
                                <Image
                                    src={qrDataUrl}
                                    alt="QR code for the secret link"
                                    width={128}
                                    height={128}
                                    className="w-32 h-32"
                                    unoptimized
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex-1 min-w-0 flex flex-col gap-3">
                        <div>
                            <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase tracking-wide">
                                Secret link
                            </label>
                            <div
                                onClick={handleUrlClick}
                                className="group flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg py-2 px-3 overflow-hidden whitespace-nowrap font-mono text-sm cursor-pointer hover:bg-stone-100 hover:border-sky-300 transition-colors select-text"
                                title="Click to copy to clipboard"
                            >
                                <span className="icon-[solar--clipboard-check-bold] text-stone-400 group-hover:text-sky-500 transition-colors shrink-0"></span>
                                {urlParts ? (
                                    <span className="min-w-0 overflow-hidden text-ellipsis">
                                        <span className="text-stone-400">{urlParts.origin}</span>
                                        <span className="font-bold text-sky-700">{urlParts.rest}</span>
                                    </span>
                                ) : (
                                    <span className="min-w-0 overflow-hidden text-ellipsis text-sky-700">{url}</span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-stone-600">
                            <span className="icon-[solar--eye-bold] text-sky-600"></span>
                            <span>
                                Can be opened{' '}
                                <strong className="text-stone-800">{maxViews === 1 ? 'once' : `${maxViews} times`}</strong>
                            </span>
                        </div>

                        {expiresAt && (
                            <div className="flex items-center gap-2 text-sm text-stone-600">
                                <span className="icon-[solar--clock-circle-bold] text-sky-600"></span>
                                <span>
                                    Expires <strong className="text-stone-700">{formatRelativeFromNow(expiresAt)}</strong> (
                                    {formatDateTime(expiresAt)})
                                </span>
                            </div>
                        )}

                        {passwordProtected && (
                            <div className="flex items-center gap-2 text-sm text-stone-600">
                                <span className="icon-[solar--lock-keyhole-bold] text-sky-400"></span>
                                <span>
                                    Protected with a <strong className="text-stone-700">passphrase</strong>
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex justify-center mt-6">
                <button
                    onClick={onReset}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
                    type="button"
                >
                    <span className="icon-[solar--add-circle-bold]"></span>
                    Share another secret
                </button>
            </div>
        </motion.div>
    );
};

export default SecretResult;
