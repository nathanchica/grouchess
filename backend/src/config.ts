import * as dotenv from 'dotenv';
import * as z from 'zod';

// Load environment variables from .env file
dotenv.config();

/**
 * Environment variable schema with Zod v4 validation
 * Provides type safety and runtime validation for all environment variables
 */
const envSchema = z.object({
    // Server Configuration
    PORT: z.coerce.number().min(1).max(65535).default(4000),
    HOST: z.string().default('0.0.0.0'),

    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    CLIENT_URL: z.url().default('http://localhost:5173'),
    JWT_SECRET: z.string().min(1),
});

/**
 * Parse and validate environment variables
 * Throws an error if validation fails
 */
const parseEnv = () => {
    try {
        return envSchema.parse(process.env);
    } catch (error) {
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
        throw error;
    }
};

// Export validated and typed environment variables
export default parseEnv();

// Export the type for use elsewhere in the application
export type Env = z.infer<typeof envSchema>;
