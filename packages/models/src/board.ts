import * as z from 'zod';

export const NUM_SQUARES = 64;
export const NUM_COLS = 8;
export const NUM_ROWS = 8;

export const BoardIndexSchema = z
    .number()
    .int()
    .min(0)
    .max(NUM_SQUARES - 1);
export type BoardIndex = z.infer<typeof BoardIndexSchema>;

export const RowColSchema = z.object({
    row: z
        .number()
        .int()
        .min(0)
        .max(NUM_ROWS - 1),
    col: z
        .number()
        .int()
        .min(0)
        .max(NUM_COLS - 1),
});
export type RowCol = z.infer<typeof RowColSchema>;
export type RowColDeltas = Array<[number, number]>;
