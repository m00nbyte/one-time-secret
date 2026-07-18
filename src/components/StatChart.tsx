// src/components/StatChart.tsx

'use client';

import {
    ArcElement,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    type ChartOptions,
    Filler,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Tooltip as ChartTooltip
} from 'chart.js';
import { Line } from 'react-chartjs-2';

import type { StatsHourlyPoint, StatsTimeSeriesPoint } from '@/types';

ChartJS.register(ArcElement, BarElement, CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, ChartTooltip);

export const SERIES_META = {
    created: { label: 'Created', color: '#0284c7' },
    consumed: { label: 'Consumed', color: '#16a34a' },
    expired: { label: 'Expired', color: '#f59e0b' },
    locked: { label: 'Locked', color: '#dc2626' }
} as const;

export type SeriesKey = keyof typeof SERIES_META;

export const DEFAULT_SERIES: SeriesKey[] = ['created', 'consumed', 'expired', 'locked'];

type Point = StatsTimeSeriesPoint | StatsHourlyPoint;

function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

export function formatDateLabel(iso: string): string {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatHourLabel(hour: number): string {
    const period = hour < 12 ? 'AM' : 'PM';
    const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${display} ${period}`;
}

const defaultOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
        mode: 'index',
        intersect: false
    },
    plugins: {
        legend: {
            position: 'bottom',
            align: 'start',
            labels: {
                usePointStyle: true,
                pointStyle: 'circle',
                boxWidth: 8,
                boxHeight: 8,
                padding: 16,
                color: '#78716c',
                font: { size: 12, weight: 500 }
            }
        },
        tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(28,25,23,0.95)',
            titleColor: '#fafaf9',
            bodyColor: '#fafaf9',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
            boxPadding: 6,
            titleFont: { size: 12, weight: 600 },
            bodyFont: { size: 12 },
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8
        }
    },
    scales: {
        x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
                color: '#a8a29e',
                font: { size: 11 },
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 8,
                padding: 8
            }
        },
        y: {
            beginAtZero: true,
            grid: { color: '#e7e5e4' },
            border: { display: false },
            ticks: { color: '#a8a29e', font: { size: 11 }, precision: 0, padding: 8 }
        }
    }
};

function buildChartData(points: Point[], series: SeriesKey[], labelFn: (p: Point) => string) {
    return {
        labels: points.map(labelFn),
        datasets: series.map((key) => {
            const color = SERIES_META[key].color;
            return {
                label: SERIES_META[key].label,
                data: points.map((p) => p[key]),
                borderColor: color,
                backgroundColor: (ctx: { chart: ChartJS }) => {
                    const { ctx: canvasCtx, chartArea } = ctx.chart;
                    if (!chartArea) return hexToRgba(color, 0);
                    const gradient = canvasCtx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                    gradient.addColorStop(0, hexToRgba(color, 0));
                    gradient.addColorStop(1, hexToRgba(color, 0.28));
                    return gradient;
                },
                borderWidth: 2.5,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointBackgroundColor: color,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointHoverBorderWidth: 2,
                tension: 0.4,
                cubicInterpolationMode: 'monotone' as const,
                fill: true
            };
        })
    };
}

interface StatChartProps {
    points: Point[];
    labelFn: (p: Point) => string;
    series?: SeriesKey[];
    height?: number;
    options?: ChartOptions<'line'>;
}

const StatChart = ({ points, labelFn, series = DEFAULT_SERIES, height = 350, options = defaultOptions }: StatChartProps) => {
    const data = buildChartData(points, series, labelFn);

    return (
        <div style={{ height }}>
            <Line data={data} options={options} />
        </div>
    );
};

export default StatChart;
