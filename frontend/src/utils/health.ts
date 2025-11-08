import { InvalidInputError, RequestTimeoutError } from '@grouchess/errors';
import { HealthStatusResponseSchema, type HealthStatusResponse } from '@grouchess/http-schemas';

import { getEnv } from './config';

const DEFAULT_TIMEOUT_MS = 800;
const HEALTH_URL = `${getEnv().VITE_API_BASE_URL}/health`;

type FetchHealthParams = {
    timeoutMs?: number;
};

/**
 * Fetches the /health endpoint with an optional timeout
 */
async function fetchHealth({ timeoutMs = DEFAULT_TIMEOUT_MS }: FetchHealthParams = {}): Promise<Response> {
    if (timeoutMs <= 0) {
        throw new InvalidInputError('timeoutMs must be a positive number.');
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(HEALTH_URL, {
            signal: controller.signal,
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
        window.clearTimeout(timeoutId);
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
