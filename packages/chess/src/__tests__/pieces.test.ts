import { aliasToPieceData, getColorFromAlias, getEnemyColor, getPiece, isValidPieceAlias } from '../pieces.js';
import type { PieceAlias } from '../schema.js';

describe('getPiece', () => {
    it.each(
        Object.entries(aliasToPieceData).map(([alias, piece]) => ({
            scenario: `returns piece data for alias ${alias}`,
            alias,
            expected: piece,
        }))
    )('$scenario', ({ alias, expected }) => {
        expect(getPiece(alias as PieceAlias)).toBe(expected);
    });
});

describe('getColorFromAlias', () => {
    it.each(
        ['P', 'R', 'N', 'B', 'Q', 'K'].map((alias) => ({
            scenario: `returns white for alias ${alias}`,
            alias,
            expected: 'white' as const,
        }))
    )('$scenario', ({ alias, expected }) => {
        expect(getColorFromAlias(alias as PieceAlias)).toBe(expected);
    });

    it.each(
        ['p', 'r', 'n', 'b', 'q', 'k'].map((alias) => ({
            scenario: `returns black for alias ${alias}`,
            alias,
            expected: 'black' as const,
        }))
    )('$scenario', ({ alias, expected }) => {
        expect(getColorFromAlias(alias as PieceAlias)).toBe(expected);
    });
});

describe('getEnemyColor', () => {
    it.each([
        {
            scenario: 'returns black when color is white',
            color: 'white' as const,
            expected: 'black' as const,
        },
        {
            scenario: 'returns white when color is black',
            color: 'black' as const,
            expected: 'white' as const,
        },
    ])('$scenario', ({ color, expected }) => {
        expect(getEnemyColor(color)).toBe(expected);
    });
});

describe('isValidPieceAlias', () => {
    it.each(
        Object.keys(aliasToPieceData).map((alias) => ({
            scenario: `returns true for valid alias ${alias}`,
            alias,
        }))
    )('$scenario', ({ alias }) => {
        expect(isValidPieceAlias(alias)).toBe(true);
    });

    it.each([
        { scenario: 'rejects empty string', alias: '' },
        { scenario: 'rejects unsupported letter', alias: 'X' },
        { scenario: 'rejects lowercase z', alias: 'z' },
        { scenario: 'rejects multiple characters', alias: 'Pk' },
        { scenario: 'rejects numeric character', alias: '1' },
        { scenario: 'rejects special character', alias: '?' },
    ])('$scenario', ({ alias }) => {
        expect(isValidPieceAlias(alias)).toBe(false);
    });
});
