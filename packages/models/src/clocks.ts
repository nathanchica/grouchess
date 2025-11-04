import * as z from 'zod';

export const ChessClockStateSchema = z.object({
    white: z.object({
        timeRemainingMs: z.number(),
        isActive: z.boolean(),
    }),
    black: z.object({
        timeRemainingMs: z.number(),
        isActive: z.boolean(),
    }),
    lastUpdatedTimeMs: z.number().nullable(),
    baseTimeMs: z.number(),
    incrementMs: z.number(),
    isPaused: z.boolean(),
});
export type ChessClockState = z.infer<typeof ChessClockStateSchema>;
