import { PlayerSchema } from '@grouchess/models';
import * as z from 'zod';

export const AuthenticatedPayloadSchema = z.object({
    playerId: PlayerSchema.shape.id,
});
export type AuthenticatedPayload = z.infer<typeof AuthenticatedPayloadSchema>;

export const ErrorEventPayloadSchema = z.object({
    message: z.string(),
});
export type ErrorEventPayload = z.infer<typeof ErrorEventPayloadSchema>;
