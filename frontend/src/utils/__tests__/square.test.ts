import { getIsDarkSquare, getLegendsForIndex } from '../square';

describe('getLegendsForIndex', () => {
    describe("Non-flipped Board (White's Perspective)", () => {
        it.each([
            { index: 56, expectedColLegend: 'a' },
            { index: 57, expectedColLegend: 'b' },
            { index: 58, expectedColLegend: 'c' },
            { index: 59, expectedColLegend: 'd' },
            { index: 60, expectedColLegend: 'e' },
            { index: 61, expectedColLegend: 'f' },
            { index: 62, expectedColLegend: 'g' },
            { index: 63, expectedColLegend: 'h' },
        ])('returns column legends for bottom row indices (56-63)', ({ index, expectedColLegend }) => {
            const result = getLegendsForIndex(index, false);

            expect(result).toBeDefined();
            expect(result?.colLegend).toBe(expectedColLegend);
        });

        it.each([
            { index: 0, expectedRowLegend: '8' },
            { index: 8, expectedRowLegend: '7' },
            { index: 16, expectedRowLegend: '6' },
            { index: 24, expectedRowLegend: '5' },
            { index: 32, expectedRowLegend: '4' },
            { index: 40, expectedRowLegend: '3' },
            { index: 48, expectedRowLegend: '2' },
            { index: 56, expectedRowLegend: '1' },
        ])('returns row legends for leftmost column indices', ({ index, expectedRowLegend }) => {
            const result = getLegendsForIndex(index, false);

            expect(result).toBeDefined();
            expect(result?.rowLegend).toBe(expectedRowLegend);
        });

        it('returns both row and column legends for bottom-left corner (index 56)', () => {
            const result = getLegendsForIndex(56, false);

            expect(result).toEqual({ rowLegend: '1', colLegend: 'a' });
        });

        it.each([
            { index: 1 },
            { index: 9 },
            { index: 17 },
            { index: 25 },
            { index: 33 },
            { index: 41 },
            { index: 49 },
        ])('returns null for indices with no legends (middle squares)', ({ index }) => {
            const result = getLegendsForIndex(index, false);

            expect(result).toBeNull();
        });

        it.each([
            { index: 1 },
            { index: 2 },
            { index: 3 },
            { index: 4 },
            { index: 5 },
            { index: 6 },
            { index: 7 },
            { index: 15 },
            { index: 23 },
            { index: 31 },
            { index: 39 },
            { index: 47 },
            { index: 55 },
        ])('returns null for top and right edge squares', ({ index }) => {
            const result = getLegendsForIndex(index, false);

            expect(result).toBeNull();
        });
    });

    describe("Flipped Board (Black's Perspective)", () => {
        it.each([
            { index: 0, expectedColLegend: 'a' },
            { index: 1, expectedColLegend: 'b' },
            { index: 2, expectedColLegend: 'c' },
            { index: 3, expectedColLegend: 'd' },
            { index: 4, expectedColLegend: 'e' },
            { index: 5, expectedColLegend: 'f' },
            { index: 6, expectedColLegend: 'g' },
            { index: 7, expectedColLegend: 'h' },
        ])('returns column legends for top row indices (0-7) when flipped', ({ index, expectedColLegend }) => {
            const result = getLegendsForIndex(index, true);

            expect(result).toBeDefined();
            expect(result?.colLegend).toBe(expectedColLegend);
        });

        it.each([
            { index: 7, expectedRowLegend: '8' },
            { index: 15, expectedRowLegend: '7' },
            { index: 23, expectedRowLegend: '6' },
            { index: 31, expectedRowLegend: '5' },
            { index: 39, expectedRowLegend: '4' },
            { index: 47, expectedRowLegend: '3' },
            { index: 55, expectedRowLegend: '2' },
            { index: 63, expectedRowLegend: '1' },
        ])('returns row legends for rightmost column indices when flipped', ({ index, expectedRowLegend }) => {
            const result = getLegendsForIndex(index, true);

            expect(result).toBeDefined();
            expect(result?.rowLegend).toBe(expectedRowLegend);
        });

        it('returns both row and column legends for top-right corner (index 7) when flipped', () => {
            const result = getLegendsForIndex(7, true);

            expect(result).toEqual({ rowLegend: '8', colLegend: 'h' });
        });

        it.each([
            { index: 8 },
            { index: 9 },
            { index: 16 },
            { index: 24 },
            { index: 32 },
            { index: 40 },
            { index: 48 },
            { index: 56 },
        ])('returns null for indices with no legends when flipped', ({ index }) => {
            const result = getLegendsForIndex(index, true);

            expect(result).toBeNull();
        });
    });

    describe('Boundary Conditions', () => {
        it('handles index 0 correctly for both orientations', () => {
            const notFlippedResult = getLegendsForIndex(0, false);
            expect(notFlippedResult).toEqual({ rowLegend: '8', colLegend: undefined });

            const flippedResult = getLegendsForIndex(0, true);
            expect(flippedResult).toEqual({ rowLegend: undefined, colLegend: 'a' });
        });

        it('handles index 63 correctly for both orientations', () => {
            const notFlippedResult = getLegendsForIndex(63, false);
            expect(notFlippedResult).toEqual({ rowLegend: undefined, colLegend: 'h' });

            const flippedResult = getLegendsForIndex(63, true);
            expect(flippedResult).toEqual({ rowLegend: '1', colLegend: undefined });
        });

        it.each([{ index: -1 }, { index: -10 }, { index: -100 }])(
            'handles negative indices gracefully',
            ({ index }) => {
                const notFlippedResult = getLegendsForIndex(index, false);
                expect(notFlippedResult).toBeNull();

                const flippedResult = getLegendsForIndex(index, true);
                expect(flippedResult).toBeNull();
            }
        );

        it.each([{ index: 64 }, { index: 100 }, { index: 1000 }])(
            'handles out-of-bounds indices gracefully (index >= 64)',
            ({ index }) => {
                const notFlippedResult = getLegendsForIndex(index, false);
                expect(notFlippedResult).toBeNull();

                const flippedResult = getLegendsForIndex(index, true);
                expect(flippedResult).toBeNull();
            }
        );
    });
});

describe('getIsDarkSquare', () => {
    it.each([
        { index: 0, expectedIsDark: false },
        { index: 1, expectedIsDark: true },
        { index: 2, expectedIsDark: false },
        { index: 3, expectedIsDark: true },
        { index: 4, expectedIsDark: false },
        { index: 5, expectedIsDark: true },
        { index: 6, expectedIsDark: false },
        { index: 7, expectedIsDark: true },
        { index: 8, expectedIsDark: true },
        { index: 9, expectedIsDark: false },
        { index: 10, expectedIsDark: true },
        { index: 11, expectedIsDark: false },
        { index: 12, expectedIsDark: true },
        { index: 13, expectedIsDark: false },
        { index: 14, expectedIsDark: true },
        { index: 15, expectedIsDark: false },
        { index: 63, expectedIsDark: true },
    ])('correctly identifies dark squares for index $index', ({ index, expectedIsDark }) => {
        const result = getIsDarkSquare(index);
        expect(result).toBe(expectedIsDark);
    });
});
