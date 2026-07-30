// src/types/index.d.ts

export interface CreateSecretRequest {
    ciphertext: string;
    password?: string;
    expiresInHours?: number;
    maxViews?: number;
    maxAttempts?: number;
}

export interface CreateSecretResponse {
    success: boolean;
    data?: {
        id: string;
        expiresAt: string;
    };
    error?: string;
}

export interface SecretMeta {
    requiresPassword: boolean;
    expiresAt: string;
    remainingViews: number;
    expired: boolean;
}

export interface SecretMetaResponse {
    success: boolean;
    data?: SecretMeta;
    error?: string;
}

export interface RevealSecretRequest {
    password?: string;
}

export interface RevealSecretResponse {
    success: boolean;
    data?: {
        ciphertext: string;
        expiresAt: string;
        remainingViews: number;
    };
    error?: string;
}

export interface ExpiryOption {
    label: string;
    hours: number;
}

export interface StatsTimeSeriesPoint {
    date: string;
    created: number;
    consumed: number;
    locked: number;
    expired: number;
}

export interface StatsHourlyPoint {
    hour: number;
    created: number;
    consumed: number;
    locked: number;
    expired: number;
}

export interface StatsBusiestDay {
    date: string | null;
    totalEvents: number;
    peakHour: number | null;
}

export interface StatsResponse {
    success: boolean;
    data?: {
        totals: {
            created: number;
            consumed: number;
            locked: number;
            expired: number;
            withPassword: number;
            withoutPassword: number;
        };
        busiestDay: StatsBusiestDay;
        timeSeries: StatsTimeSeriesPoint[];
        hourly: StatsHourlyPoint[];
    };
    error?: string;
}

export interface StatItem {
    icon: string;
    value: number | string;
    label: string;
    accent: string;
    color: string;
    description?: string;
}
