import request from 'supertest';

import { createApp } from '../../app.js';

const { parseMock, mockSupportedTimeControls } = vi.hoisted(() => ({
    parseMock: vi.fn(),
    mockSupportedTimeControls: ['3+0', '5+5'],
}));

vi.mock('@grouchess/http-schemas', () => ({
    GetTimeControlOptionsResponseSchema: {
        parse: parseMock,
    },
}));

vi.mock('@grouchess/game-room', () => ({
    SUPPORTED_TIME_CONTROLS: mockSupportedTimeControls,
}));

describe('GET /time-control', () => {
    beforeEach(() => {
        parseMock.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns the schema-validated time control options', async () => {
        const validatedResponse = {
            supportedTimeControls: mockSupportedTimeControls,
        };
        parseMock.mockReturnValue(validatedResponse);

        const response = await request(createApp()).get('/time-control');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(validatedResponse);
        expect(parseMock).toHaveBeenCalledTimes(1);
        expect(parseMock).toHaveBeenCalledWith({
            supportedTimeControls: mockSupportedTimeControls,
        });
    });

    it('responds with a 500 error when schema parsing fails', async () => {
        const schemaError = new Error('schema failure');
        parseMock.mockImplementation(() => {
            throw schemaError;
        });
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const response = await request(createApp()).get('/time-control');

        expect(parseMock).toHaveBeenCalledTimes(1);
        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'Internal server error' });
        expect(errorSpy).toHaveBeenCalledWith('Error getting time control options:', schemaError);
    });
});
