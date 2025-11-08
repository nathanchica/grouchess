import * as z from 'zod';

/**
 * Environment variable schema with Zod v4 validation
 * Provides type safety and runtime validation for all environment variables
 */
const envSchema = z.object({
    VITE_API_BASE_URL: z.url().default('http://localhost:4000'),
    VITE_WEBSOCKET_URL: z.url().default('http://localhost:4000'),

    VITE_SENTRY_DSN: z.url().optional(),
    VITE_SENTRY_TRACES_SAMPLE_RATE: z.number().min(0).max(1).default(0.1).optional(),
});

/**
 * Parse and validate environment variables
 * Throws an error if validation fails
 */
const parseEnv = () => {
    try {
        return envSchema.parse(import.meta.env);
    } catch (error) {
        /* v8 ignore else -- @preserve */
        if (error instanceof z.ZodError) {
            const errorMessage = error.issues
                .map((issue) => {
                    const path = issue.path.join('.');
                    return `  ❌ ${path}: ${issue.message}`;
                })
                .join('\n');

            throw new Error(
                `\n🔥 Environment validation failed:\n${errorMessage}\n\n` +
                    `Please check your .env file and ensure all required variables are set correctly.`
            );
        }
        // Defensive re-throw for unexpected errors
        /* v8 ignore next -- @preserve */
        throw error;
    }
};

// Export the type for use elsewhere in the application
export type Env = z.infer<typeof envSchema>;

/**
 * Store the cached environment variables after first retrieval
 */
let cachedEnv: Env | undefined;

/**
 * Get the validated environment variables
 */
export function getEnv() {
    if (!cachedEnv) {
        cachedEnv = parseEnv();
    }
    return cachedEnv;
}
