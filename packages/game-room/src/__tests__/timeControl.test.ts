import {
    SUPPORTED_TIME_CONTROLS,
    TimeControlSchema,
    getTimeControlByAlias,
    isValidTimeControlAlias,
} from '../timeControl.js';

describe('getTimeControlByAlias', () => {
    it.each(
        SUPPORTED_TIME_CONTROLS.map((timeControl) => ({
            scenario: `returns time control for alias ${timeControl.alias}`,
            alias: timeControl.alias,
            expected: timeControl,
        }))
    )('$scenario', ({ alias, expected }) => {
        expect(getTimeControlByAlias(alias)).toBe(expected);
    });

    it('returns null when alias is unsupported', () => {
        expect(getTimeControlByAlias('999|999')).toBeNull();
    });
});

describe('isValidTimeControlAlias', () => {
    it.each(
        SUPPORTED_TIME_CONTROLS.map((timeControl) => ({
            scenario: `recognizes alias ${timeControl.alias}`,
            alias: timeControl.alias,
        }))
    )('$scenario', ({ alias }) => {
        expect(isValidTimeControlAlias(alias)).toBe(true);
    });

    it('rejects unsupported aliases', () => {
        expect(isValidTimeControlAlias('bullet')).toBe(false);
    });
});

describe('TimeControlSchema', () => {
    it.each(
        SUPPORTED_TIME_CONTROLS.map((timeControl) => ({
            scenario: `parses supported alias ${timeControl.alias}`,
            timeControl,
        }))
    )('$scenario', ({ timeControl }) => {
        expect(TimeControlSchema.parse(timeControl)).toEqual(timeControl);
    });

    it('parses supported alias when fischer mode is provided', () => {
        expect(
            TimeControlSchema.parse({
                alias: '1|0',
                minutes: 1,
                increment: 0,
                displayText: '1 min',
                mode: 'fischer',
            })
        ).toEqual({
            alias: '1|0',
            minutes: 1,
            increment: 0,
            displayText: '1 min',
            mode: 'fischer',
        });
    });

    it('fails when alias is not supported', () => {
        const result = TimeControlSchema.safeParse({
            alias: '1|5',
            minutes: 1,
            increment: 5,
            displayText: '1|5',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.message).toBe('Invalid time control alias');
        }
    });

    it('fails when minutes are negative', () => {
        const result = TimeControlSchema.safeParse({
            alias: '1|0',
            minutes: -1,
            increment: 0,
            displayText: '1 min',
        });

        expect(result.success).toBe(false);
    });
});
