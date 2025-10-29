import * as z from 'zod';

export const SUPPORTED_TIME_CONTROLS: TimeControl[] = [
    { alias: '1|0', minutes: 1, increment: 0, displayText: '1 min' },
    { alias: '1|1', minutes: 1, increment: 1, displayText: '1|1' },
    { alias: '2|1', minutes: 2, increment: 1, displayText: '2|1' },
    { alias: '3|0', minutes: 3, increment: 0, displayText: '3 min' },
    { alias: '3|2', minutes: 3, increment: 2, displayText: '3|2' },
    { alias: '5|0', minutes: 5, increment: 0, displayText: '5 min' },
    { alias: '10|0', minutes: 10, increment: 0, displayText: '10 min' },
    { alias: '15|10', minutes: 15, increment: 10, displayText: '15|10' },
    { alias: '30|0', minutes: 30, increment: 0, displayText: '30 min' },
];

const timeControlByAlias = SUPPORTED_TIME_CONTROLS.reduce<Record<string, TimeControl>>((result, timeControl) => {
    result[timeControl.alias] = timeControl;
    return result;
}, {});

export function getTimeControlByAlias(alias: string): TimeControl | null {
    return timeControlByAlias[alias] || null;
}

export function isValidTimeControlAlias(alias: string): boolean {
    return Object.hasOwn(timeControlByAlias, alias);
}

export const TimeControlSchema = z.object({
    alias: z.string().refine((alias) => isValidTimeControlAlias(alias), {
        message: 'Invalid time control alias',
    }),
    minutes: z.number().int().nonnegative(),
    increment: z.number().int().nonnegative(),
    displayText: z.string(),
    mode: z.literal('fischer').optional(),
});
export type TimeControl = z.infer<typeof TimeControlSchema>;
