// src/app/s/page.tsx

'use client';

import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { decodeShareToken, decryptClient } from '@/libs/client-crypto';
import { formatDateTime, formatRelativeFromNow } from '@/libs/datetime';
import type { RevealSecretResponse, SecretMetaResponse } from '@/types';

type ViewState = 'loading' | 'ready' | 'password' | 'revealed' | 'gone' | 'invalid';

function parseHash(): { id: string; key: string } | null {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash.slice(1);
    if (!hash) return null;
    return decodeShareToken(hash);
}

function SecretView() {
    const [viewState, setViewState] = useState<ViewState>('loading');
    const [meta, setMeta] = useState<SecretMetaResponse['data'] | null>(null);
    const [secretId, setSecretId] = useState<string | null>(null);
    const [secretKey, setSecretKey] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [revealed, setRevealed] = useState<string | null>(null);
    const [remainingViews, setRemainingViews] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);

    const loadMeta = useCallback(async (id: string) => {
        try {
            const res = await fetch(`/api/secrets/${id}`, { cache: 'no-store' });
            const data = (await res.json()) as SecretMetaResponse;

            if (!res.ok || !data.success) {
                setError(data.error || 'Unable to load this secret.');
                setViewState('gone');
                return;
            }

            setMeta(data.data!);

            if (data.data!.remainingViews <= 0 || data.data!.expired) {
                setViewState('gone');
            } else if (data.data!.requiresPassword) {
                setViewState('password');
            } else {
                setViewState('ready');
            }
        } catch {
            setError('Unable to load this secret.');
            setViewState('gone');
        }
    }, []);

    useEffect(() => {
        const parsed = parseHash();

        if (!parsed) {
            setViewState('invalid');
            return;
        }

        setSecretId(parsed.id);
        setSecretKey(parsed.key);
        loadMeta(parsed.id);
    }, [loadMeta]);

    async function handleReveal() {
        if (!secretId || !secretKey) return;

        setSubmitting(true);
        setError(null);

        try {
            const res = await fetch(`/api/secrets/${secretId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: meta?.requiresPassword ? password : undefined })
            });
            const data = (await res.json()) as RevealSecretResponse;

            if (!res.ok || !data.success) {
                setError(data.error || 'Failed to reveal secret.');
                setSubmitting(false);
                return;
            }

            try {
                const plaintext = await decryptClient(data.data!.ciphertext, secretKey);

                setRevealed(plaintext);
                setRemainingViews(data.data!.remainingViews);
                setViewState('revealed');
            } catch {
                setError('Decryption failed. The link may be corrupted or incomplete.');
                setViewState('gone');
            }
        } catch {
            setError('Failed to reveal secret.');
            setSubmitting(false);
        }
    }

    function handleCopy() {
        if (!revealed) return;

        navigator.clipboard.writeText(revealed).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    return (
        <div className="container mx-auto bg-stone-50 text-stone-900 p-4 md:p-6">
            <div className="max-w-2xl mx-auto">
                <AnimatePresence mode="wait">
                    {viewState === 'loading' && (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="bg-white border border-stone-200 rounded-xl p-8 text-center shadow-sm"
                        >
                            <span className="icon-[svg-spinners--ring-resize] text-3xl text-sky-600 block mb-3 mx-auto"></span>
                            <p className="text-stone-500">Loading secret...</p>
                        </motion.div>
                    )}

                    {viewState === 'invalid' && (
                        <motion.div
                            key="invalid"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                        >
                            <div className="bg-white border border-rose-200 rounded-xl p-8 text-center shadow-sm">
                                <span className="icon-[solar--danger-triangle-bold] text-4xl text-rose-500 block mb-3 mx-auto"></span>
                                <h2 className="text-xl font-bold mb-2">Invalid link</h2>
                                <p className="text-stone-500">This link is missing the decryption key.</p>
                                <p className="text-stone-500">
                                    Make sure you copied the full URL including the part after the #.
                                </p>
                            </div>
                            <div className="flex justify-center mt-6">
                                <Link
                                    href="/"
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
                                    type="button"
                                >
                                    <span className="icon-[solar--add-circle-bold]"></span>
                                    Share another secret
                                </Link>
                            </div>
                        </motion.div>
                    )}

                    {viewState === 'gone' && (
                        <motion.div
                            key="gone"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                        >
                            <div className="bg-white border border-rose-200 rounded-xl p-8 text-center shadow-sm">
                                <span className="icon-[solar--trash-bin-trash-bold] text-4xl text-rose-500 block mb-3 mx-auto"></span>
                                <h2 className="text-xl font-bold mb-2">Secret unavailable</h2>
                                <p className="text-stone-500">
                                    {error || 'This secret does not exist, has already been viewed, or has expired.'}
                                </p>
                            </div>
                            <div className="flex justify-center mt-6">
                                <Link
                                    href="/"
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
                                    type="button"
                                >
                                    <span className="icon-[solar--add-circle-bold]"></span>
                                    Share another secret
                                </Link>
                            </div>
                        </motion.div>
                    )}

                    {viewState === 'ready' && (
                        <motion.div
                            key="ready"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <span className="icon-[solar--danger-triangle-bold] text-3xl text-amber-500"></span>
                                <h2 className="text-xl font-bold">Ready to reveal</h2>
                            </div>
                            <p className="text-stone-600 mb-4">
                                {(meta?.remainingViews ?? 1) === 1 ? (
                                    <>
                                        This message will be <strong>permanently destroyed</strong> the moment you view it. Make
                                        sure you are ready.
                                    </>
                                ) : (
                                    <>
                                        This message can be opened <strong>{meta?.remainingViews} more times</strong>. Revealing
                                        it now will use one of those views.
                                    </>
                                )}
                            </p>
                            {meta && (
                                <div className="flex flex-col gap-2 mb-5">
                                    <div className="flex items-center gap-2 text-sm text-stone-600">
                                        <span className="icon-[solar--clock-circle-bold] text-sky-600"></span>
                                        <span>
                                            Expires{' '}
                                            <strong className="text-stone-700">{formatRelativeFromNow(meta.expiresAt)}</strong>{' '}
                                            ({formatDateTime(meta.expiresAt)})
                                        </span>
                                    </div>
                                    {meta.requiresPassword && (
                                        <div className="flex items-center gap-2 text-sm text-stone-600">
                                            <span className="icon-[solar--lock-keyhole-bold] text-sky-600"></span>
                                            <span>
                                                Protected with a <strong className="text-stone-700">passphrase</strong>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                            <button
                                onClick={handleReveal}
                                disabled={submitting}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors cursor-pointer"
                            >
                                {submitting ? (
                                    <>
                                        <span className="icon-[svg-spinners--ring-resize]"></span>
                                        Revealing...
                                    </>
                                ) : (
                                    <>
                                        <span className="icon-[solar--eye-scan-bold]"></span>
                                        Reveal secret
                                    </>
                                )}
                            </button>
                            {error && (
                                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-sm flex items-center">
                                    <span className="icon-[solar--danger-triangle-bold] mr-2"></span>
                                    {error}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {viewState === 'password' && (
                        <motion.div
                            key="password"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <span className="icon-[solar--lock-keyhole-bold] text-3xl text-sky-600"></span>
                                <h2 className="text-xl font-bold">Password required</h2>
                            </div>
                            <p className="text-stone-600 mb-4">
                                This secret is protected with a password. Enter it below to reveal the message.
                            </p>
                            {meta && (
                                <div className="flex flex-col gap-2 mb-5">
                                    <div className="flex items-center gap-2 text-sm text-stone-600">
                                        <span className="icon-[solar--eye-bold] text-sky-600"></span>
                                        <span>
                                            Can be opened{' '}
                                            <strong className="text-stone-800">
                                                {meta.remainingViews === 1 ? 'once' : `${meta.remainingViews} times`}
                                            </strong>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-stone-600">
                                        <span className="icon-[solar--clock-circle-bold] text-sky-600"></span>
                                        <span>
                                            Expires{' '}
                                            <strong className="text-stone-700">{formatRelativeFromNow(meta.expiresAt)}</strong>{' '}
                                            ({formatDateTime(meta.expiresAt)})
                                        </span>
                                    </div>
                                </div>
                            )}
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleReveal();
                                }}
                                placeholder="Enter password"
                                className="w-full px-4 py-3 bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all text-stone-900 placeholder-stone-400 mb-4"
                                disabled={submitting}
                                autoFocus
                            />
                            <button
                                onClick={handleReveal}
                                disabled={submitting || !password}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors cursor-pointer"
                            >
                                {submitting ? (
                                    <>
                                        <span className="icon-[svg-spinners--ring-resize]"></span>
                                        Unlocking...
                                    </>
                                ) : (
                                    <>
                                        <span className="icon-[solar--eye-scan-bold]"></span>
                                        Unlock & reveal
                                    </>
                                )}
                            </button>
                            {error && (
                                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-sm flex items-center">
                                    <span className="icon-[solar--danger-triangle-bold] mr-2"></span>
                                    {error}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {viewState === 'revealed' && revealed !== null && (
                        <div>
                            <motion.div
                                key="revealed"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                                className="bg-white border border-sky-200 rounded-xl p-6 shadow-sm"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="icon-[solar--check-circle-bold] text-3xl text-sky-600"></span>
                                    <h2 className="text-xl font-bold">Secret message</h2>
                                </div>
                                <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 mb-4 whitespace-pre-wrap break-words font-mono text-sm text-stone-800">
                                    {revealed}
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <button
                                        onClick={handleCopy}
                                        className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-medium transition-colors cursor-pointer"
                                        type="button"
                                    >
                                        <span className="icon-[solar--clipboard-check-bold]"></span>
                                        {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                    <span className="text-xs text-stone-400 flex items-center gap-1 mt-2.5">
                                        <span className="icon-[solar--trash-bin-trash-bold]"></span>
                                        {`${remainingViews || 0} view${remainingViews === 1 ? '' : 's'} remaining`}
                                    </span>
                                </div>
                            </motion.div>
                            <p className="flex items-center justify-center text-stone-500 text-sm mt-8">
                                You can close this window when you&apos;re done.
                            </p>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default SecretView;
