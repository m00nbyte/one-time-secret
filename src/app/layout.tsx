// src/app/layout.tsx

import '@/styles/global.sass';

import type { Metadata } from 'next';
import { Fira_Mono, Fira_Sans } from 'next/font/google';
import Link from 'next/link';

const firaSans = Fira_Sans({
    weight: '500',
    variable: '--font-fira-sans',
    subsets: ['latin']
});

const firaMono = Fira_Mono({
    weight: '500',
    variable: '--font-fira-mono',
    subsets: ['latin']
});

export const metadata: Metadata = {
    title: 'One Time Secret',
    description: 'Send secrets that self-destruct',
    manifest: '/manifest.json',
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
    icons: {
        icon: [{ url: '/favicon.ico' }],
        apple: [{ url: '/apple-icon.png' }],
        other: [
            {
                rel: 'icon',
                url: '/web-app-manifest-192x192.png',
                sizes: '192x192',
                type: 'image/png'
            },
            {
                rel: 'icon',
                url: '/web-app-manifest-512x512.png',
                sizes: '512x512',
                type: 'image/png'
            }
        ]
    }
};

function RootLayout({
    children
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="h-full">
            <body
                className={`bg-stone-50 text-stone-900 ${firaSans.className} ${firaMono.variable} min-h-screen flex flex-col`}
            >
                <main className="flex-grow">{children}</main>
                <footer className="bg-white border-t border-stone-200 py-8">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-stone-500">
                        <p>
                            &copy; {new Date().getFullYear()} by{' '}
                            <Link
                                href="https://moonbyte.at/"
                                target="_blank"
                                className="underline text-sky-600 hover:text-sky-700"
                            >
                                m00nbyte
                            </Link>
                        </p>
                    </div>
                </footer>
            </body>
        </html>
    );
}

export default RootLayout;
