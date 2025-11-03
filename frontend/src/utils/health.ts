import { InvalidInputError, NotConfiguredError, RequestTimeoutError } from '@grouchess/errors';
import { HealthStatusResponseSchema, type HealthStatusResponse } from '@grouchess/http-schemas';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const DEFAULT_TIMEOUT_MS = 800;

type FetchHealthParams = {
    timeoutMs?: number;
};

/**
 * Fetches the /health endpoint with an optional timeout
 */
async function fetchHealth({ timeoutMs = DEFAULT_TIMEOUT_MS }: FetchHealthParams = {}): Promise<Response> {
    if (!apiBaseUrl) {
        throw new NotConfiguredError('API base URL is not configured.');
    }
    if (timeoutMs <= 0) {
        throw new InvalidInputError('timeoutMs must be a positive number.');
    }

    const controller = timeoutMs ? new AbortController() : null;
    const timeoutId = timeoutMs ? window.setTimeout(() => controller?.abort(), timeoutMs) : null;

    try {
        const response = await fetch(`${apiBaseUrl}/health`, {
            signal: controller?.signal,
        });

        if (!response.ok) {
            throw new Error('Unable to load service health right now.');
        }

        return response;
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new RequestTimeoutError();
        }

        throw error;
    } finally {
        if (timeoutId !== null) {
            window.clearTimeout(timeoutId);
        }
    }
}

/**
 * Fetches and parses the /health endpoint response
 */
export async function fetchParsedHealthStatus({ timeoutMs }: FetchHealthParams = {}): Promise<HealthStatusResponse> {
    const response = await fetchHealth({ timeoutMs });

    const json = await response.json();
    return HealthStatusResponseSchema.parse(json);
}

/**
 * Checks the health endpoint once, returning true if healthy, false otherwise.
 */
export async function checkHealthStatus({ timeoutMs }: FetchHealthParams = {}): Promise<boolean> {
    try {
        await fetchHealth({ timeoutMs });
        return true;
    } catch {
        return false;
    }
}
