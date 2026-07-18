// src/libs/datetime.ts

import { format, formatDistanceToNowStrict } from 'date-fns';

export function formatDateTime(dateInput: string | Date): string {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return format(d, 'MMM d, yyyy h:mm a');
}

export function formatRelativeFromNow(dateInput: string | Date): string {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return formatDistanceToNowStrict(d, { addSuffix: true });
}
