import { TimeControlSchema } from '@grouchess/models';
import * as z from 'zod';

export const GetTimeControlOptionsResponseSchema = z.object({
    supportedTimeControls: z.array(TimeControlSchema),
});
export type GetTimeControlOptionsResponse = z.infer<typeof GetTimeControlOptionsResponseSchema>;
