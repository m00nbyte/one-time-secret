// src/components/SecretForm.tsx

'use client';

import { AnimatePresence, motion } from 'motion/react';
import QRCode from 'qrcode';
import { useEffect, useMemo, useRef, useState } from 'react';

import { encodeShareToken, encryptClient } from '@/libs/client-crypto';
import {
    EXPIRY_OPTIONS,
    formatBytes,
    isPlaintextTooLarge,
    MAX_ALLOWED_ATTEMPTS,
    MAX_ALLOWED_VIEWS,
    MAX_PLAINTEXT_BYTES,
    utf8ByteLength
} from '@/libs/limits';
import type { CreateSecretResponse } from '@/types';

export interface CreatedSecret {
    url: string;
    expiresAt: string;
    maxViews: number;
    passwordProtected: boolean;
    qrDataUrl: string | null;
}

interface SecretFormProps {
    onCreated: (secret: CreatedSecret) => void;
    onToast: (message: string) => void;
}

const SecretForm = ({ onCreated, onToast }: SecretFormProps) => {
    const [content, setContent] = useState('');
    const [password, setPassword] = useState('');
    const [enablePassword, setEnablePassword] = useState(false);
    const [expiresInHours, setExpiresInHours] = useState(24);
    const [enableMaxViews, setEnableMaxViews] = useState(false);
    const [maxViews, setMaxViews] = useState('1');
    const [maxAttempts, setMaxAttempts] = useState('5');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expiryOpen, setExpiryOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const expiryRef = useRef<HTMLDivElement>(null);

    const { byteLength, tooLarge } = useMemo(
        () => ({
            byteLength: utf8ByteLength(content),
            tooLarge: isPlaintextTooLarge(content)
        }),
        [content]
    );

    const maxViewsOverLimit = enableMaxViews && maxViews !== '' && Number(maxViews) > MAX_ALLOWED_VIEWS;
    const maxAttemptsOverLimit = enablePassword && maxAttempts !== '' && Number(maxAttempts) > MAX_ALLOWED_ATTEMPTS;
    const contentEmpty = !content.trim();

    useEffect(() => {
        if (!expiryOpen) return;
        function handleClickOutside(e: MouseEvent) {
            if (expiryRef.current && !expiryRef.current.contains(e.target as Node)) {
                setExpiryOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [expiryOpen]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!content.trim()) {
            setError('Please enter a message');
            return;
        }

        if (tooLarge) {
            setError(
                `Message too large. Your message is ${formatBytes(byteLength)}, but the limit is ${formatBytes(
                    MAX_PLAINTEXT_BYTES
                )} (about ${MAX_PLAINTEXT_BYTES.toLocaleString()} characters). Please shorten it.`
            );
            return;
        }

        setLoading(true);

        try {
            const { ciphertext, key } = await encryptClient(content);

            const effectiveMaxViews = enableMaxViews && maxViews ? Math.max(1, Math.floor(Number(maxViews))) : 1;

            const res = await fetch('/api/secrets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ciphertext,
                    password: enablePassword && password ? password : undefined,
                    expiresInHours,
                    maxViews: effectiveMaxViews,
                    maxAttempts: enablePassword ? Math.max(1, Math.floor(Number(maxAttempts)) || 5) : undefined
                })
            });

            const data = (await res.json()) as CreateSecretResponse;

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to create secret');
            }

            const url = `${window.location.origin}/s#${encodeShareToken(data.data!.id, key)}`;

            let qrDataUrl: string | null = null;
            try {
                qrDataUrl = await QRCode.toDataURL(url, {
                    width: 240,
                    margin: 2,
                    color: { dark: '#065f46', light: '#ffffff' }
                });
            } catch {
                // QR generation failure is non-fatal
            }

            if (navigator.clipboard) {
                navigator.clipboard
                    .writeText(url)
                    .then(() => onToast('Link copied to clipboard'))
                    .catch(() => {
                        // Clipboard write failure is non-fatal
                    });
            }

            onCreated({
                url,
                expiresAt: data.data!.expiresAt,
                maxViews: effectiveMaxViews,
                passwordProtected: enablePassword && !!password,
                qrDataUrl
            });
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.05, ease: 'easeOut' }}
            className="bg-white border border-stone-200 rounded-xl p-6 pt-4 shadow-sm"
        >
            <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type your secret message here..."
                rows={6}
                className="w-full px-4 py-3 bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all text-stone-900 placeholder-stone-400 resize-y"
                disabled={loading}
            />
            <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className={`ml-1 text-xs ${tooLarge ? 'text-rose-500 font-medium' : 'text-stone-400'}`}>
                    {byteLength.toLocaleString()} / {MAX_PLAINTEXT_BYTES.toLocaleString()} characters
                </span>
                <div className="relative" ref={expiryRef}>
                    <button
                        type="button"
                        onClick={() => setExpiryOpen(!expiryOpen)}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        <span className="icon-[solar--clock-circle-bold] text-sky-700 -mt-0.5"></span>
                        Expires in {EXPIRY_OPTIONS.find((o) => o.hours === expiresInHours)?.label ?? '24 hours'}
                        <span
                            className={`icon-[solar--alt-arrow-down-bold] text-stone-400 transition-transform ${
                                expiryOpen ? 'rotate-180' : ''
                            }`}
                        ></span>
                    </button>
                    {expiryOpen && (
                        <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-stone-200 rounded-lg shadow-lg z-10 py-1">
                            {EXPIRY_OPTIONS.map((opt) => (
                                <button
                                    key={opt.hours}
                                    type="button"
                                    onClick={() => {
                                        setExpiresInHours(opt.hours);
                                        setExpiryOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between cursor-pointer ${
                                        expiresInHours === opt.hours
                                            ? 'bg-sky-100 text-sky-700 font-medium'
                                            : 'text-stone-600 hover:bg-stone-200'
                                    }`}
                                >
                                    {opt.label}
                                    {expiresInHours === opt.hours && (
                                        <span className="icon-[solar--check-circle-bold] text-sky-700"></span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4 space-y-2">
                <div className="px-4 py-2.5 bg-stone-50 rounded-lg border border-stone-200">
                    <div
                        className="flex items-center justify-between gap-3 cursor-pointer"
                        onClick={() => {
                            setEnablePassword(!enablePassword);
                            if (enablePassword) {
                                setPassword('');
                                setShowPassword(false);
                                setMaxAttempts('5');
                            }
                        }}
                    >
                        <div className="flex items-center gap-2 text-sm font-medium text-stone-700">
                            <span
                                className={`icon-[solar--key-bold] ${enablePassword ? 'text-sky-700' : 'text-stone-400'}`}
                            ></span>
                            Passphrase protection
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={enablePassword}
                            onClick={() => {
                                setEnablePassword(!enablePassword);
                                if (enablePassword) {
                                    setPassword('');
                                    setShowPassword(false);
                                    setMaxAttempts('5');
                                }
                            }}
                            disabled={loading}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                                enablePassword ? 'bg-sky-700' : 'bg-stone-300'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    enablePassword ? 'translate-x-4' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>
                    <AnimatePresence initial={false}>
                        {enablePassword && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.15, ease: 'easeInOut' }}
                                className="overflow-hidden"
                            >
                                <div className="mt-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                                        <div className="sm:col-span-4">
                                            <label
                                                htmlFor="password"
                                                className="block text-xs font-medium text-stone-500 mb-1.5 uppercase tracking-wide"
                                            >
                                                Passphrase
                                            </label>
                                            <div className="relative">
                                                <input
                                                    id="password"
                                                    type={showPassword ? 'text' : 'password'}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    placeholder="Enter a passphrase"
                                                    className="w-full px-4 py-2.5 pr-11 bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all text-stone-900 placeholder-stone-400 text-sm"
                                                    disabled={loading}
                                                    autoComplete="new-password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    disabled={loading}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-sky-500 transition-colors cursor-pointer p-1"
                                                    title={showPassword ? 'Hide passphrase' : 'Show passphrase'}
                                                    aria-label={showPassword ? 'Hide passphrase' : 'Show passphrase'}
                                                >
                                                    {showPassword ? (
                                                        <span className="icon-[mdi--eye-off-outline] text-lg mt-1"></span>
                                                    ) : (
                                                        <span className="icon-[mdi--eye-outline] text-lg mt-1"></span>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="sm:col-span-1">
                                            <label
                                                htmlFor="maxAttempts"
                                                className="block text-xs font-medium text-stone-500 mb-1.5 uppercase tracking-wide"
                                            >
                                                Max attempts
                                            </label>
                                            <input
                                                id="maxAttempts"
                                                type="number"
                                                min={1}
                                                max={MAX_ALLOWED_ATTEMPTS}
                                                value={maxAttempts}
                                                onChange={(e) => setMaxAttempts(e.target.value)}
                                                placeholder="5"
                                                className={`w-full px-4 py-2.5 bg-white border rounded-lg focus:outline-none focus:ring-2 transition-all text-stone-900 placeholder-stone-400 text-sm ${
                                                    maxAttemptsOverLimit
                                                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                                                        : 'border-stone-300 focus:border-sky-500 focus:ring-sky-500/20'
                                                }`}
                                                disabled={loading}
                                            />
                                        </div>
                                    </div>
                                    {maxAttemptsOverLimit ? (
                                        <p className="text-xs text-rose-500 mt-2 font-medium">
                                            Max {MAX_ALLOWED_ATTEMPTS.toLocaleString()} attempts allowed.
                                        </p>
                                    ) : (
                                        <p className="text-xs text-stone-400 mt-2">
                                            After the max attempts of wrong passphrases, the secret is permanently locked.
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="px-4 py-2.5 bg-stone-50 rounded-lg border border-stone-200">
                    <div
                        className="flex items-center justify-between gap-3 cursor-pointer"
                        onClick={() => {
                            setEnableMaxViews(!enableMaxViews);
                            if (enableMaxViews) setMaxViews('');
                        }}
                    >
                        <div className="flex items-center gap-2 text-sm font-medium text-stone-700">
                            <span
                                className={`icon-[solar--eye-bold] ${enableMaxViews ? 'text-sky-700' : 'text-stone-400'}`}
                            ></span>
                            Max views
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={enableMaxViews}
                            onClick={() => {
                                setEnableMaxViews(!enableMaxViews);
                                if (enableMaxViews) setMaxViews('');
                            }}
                            disabled={loading}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                                enableMaxViews ? 'bg-sky-700' : 'bg-stone-300'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    enableMaxViews ? 'translate-x-4' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>
                    <AnimatePresence initial={false}>
                        {enableMaxViews && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.15, ease: 'easeInOut' }}
                                className="overflow-hidden"
                            >
                                <div className="mt-3">
                                    <input
                                        type="number"
                                        min={1}
                                        max={MAX_ALLOWED_VIEWS}
                                        value={maxViews}
                                        onChange={(e) => setMaxViews(e.target.value)}
                                        placeholder="1"
                                        className={`w-full px-4 py-2.5 bg-white border rounded-lg focus:outline-none focus:ring-2 transition-all text-stone-900 placeholder-stone-400 text-sm ${
                                            maxViewsOverLimit
                                                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                                                : 'border-stone-300 focus:border-sky-500 focus:ring-sky-500/20'
                                        }`}
                                        disabled={loading}
                                    />
                                    {maxViewsOverLimit ? (
                                        <p className="text-xs text-rose-500 mt-2 font-medium">
                                            Max {MAX_ALLOWED_VIEWS.toLocaleString()} views allowed.
                                        </p>
                                    ) : (
                                        <p className="text-xs text-stone-400 mt-2">
                                            The link will self-destruct after this many views.
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-sm flex items-center">
                            <span className="icon-[solar--danger-triangle-bold] mr-2 -mt-0.5"></span>
                            {error}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                type="submit"
                disabled={loading || tooLarge || contentEmpty || maxViewsOverLimit || maxAttemptsOverLimit}
                className="mt-5 w-full flex items-center justify-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors cursor-pointer"
            >
                {loading ? (
                    <>
                        <span className="icon-[svg-spinners--ring-resize]"></span>
                        Encrypting & creating...
                    </>
                ) : (
                    <>Create secret link</>
                )}
            </button>
        </motion.form>
    );
};

export default SecretForm;
