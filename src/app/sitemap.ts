// src/app/sitemap.ts

import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();

    return [
        {
            url: `${BASE_URL}/`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 1
        },
        {
            url: `${BASE_URL}/stats`,
            lastModified: now,
            changeFrequency: 'hourly',
            priority: 0.5
        }
    ];
}

export default sitemap;
