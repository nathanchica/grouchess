import { SUPPORTED_TIME_CONTROLS, getTimeControlByAlias, isValidTimeControlAlias } from '../timeControl.js';

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
