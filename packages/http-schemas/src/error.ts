import * as z from 'zod';

export const ErrorResponseSchema = z.object({
    error: z.string(),
    details: z.optional(z.array(z.unknown())),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
