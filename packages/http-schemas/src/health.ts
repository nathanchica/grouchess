import * as z from 'zod';

export const HealthStatusResponseSchema = z.object({
    status: z.string(),
    service: z.string(),
    uptime: z.number(),
    timestamp: z.coerce.date(),
});

export type HealthStatusResponse = z.infer<typeof HealthStatusResponseSchema>;
