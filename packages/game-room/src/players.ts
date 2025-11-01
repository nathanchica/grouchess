import * as z from 'zod';

export const MAX_PLAYER_DISPLAY_NAME_LENGTH = 20;

export const PlayerStatusEnum = z.enum(['online', 'offline', 'away']);
export const PlayerSchema = z.object({
    id: z.string(),
    displayName: z
        .string()
        .trim()
        .regex(/^[a-z0-9 ]*$/i, 'Display name must be alphanumeric and can include spaces.')
        .max(
            MAX_PLAYER_DISPLAY_NAME_LENGTH,
            `Display name is too long. Max ${MAX_PLAYER_DISPLAY_NAME_LENGTH} characters`
        ),
});
export type Player = z.infer<typeof PlayerSchema>;
