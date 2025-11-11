import type { PointerEvent } from 'react';

import { getLegendsForIndex, getRowColFromXY, xyFromPointerEvent } from '../board';

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

describe('getRowColFromXY', () => {
    describe('Non-flipped Board', () => {
        it('returns correct row/col for top-left square (0, 0)', () => {
            const result = getRowColFromXY(0, 0, 50, false);

            expect(result).toEqual({ row: 0, col: 0 });
        });

        it('returns correct row/col for bottom-right square', () => {
            const result = getRowColFromXY(350, 350, 50, false);

            expect(result).toEqual({ row: 7, col: 7 });
        });

        it('returns correct row/col for middle of a square', () => {
            const result = getRowColFromXY(125, 225, 50, false);

            expect(result).toEqual({ row: 4, col: 2 });
        });

        it('returns correct row/col at square boundaries', () => {
            const result = getRowColFromXY(100, 150, 50, false);

            expect(result).toEqual({ row: 3, col: 2 });
        });

        it.each([
            { scenario: 'squareSize=25', squareSize: 25, x: 50, y: 75, expectedRow: 3, expectedCol: 2 },
            { scenario: 'squareSize=50', squareSize: 50, x: 100, y: 150, expectedRow: 3, expectedCol: 2 },
            { scenario: 'squareSize=100', squareSize: 100, x: 200, y: 300, expectedRow: 3, expectedCol: 2 },
            { scenario: 'squareSize=80', squareSize: 80, x: 160, y: 240, expectedRow: 3, expectedCol: 2 },
        ])('handles different square sizes correctly ($scenario)', ({ squareSize, x, y, expectedRow, expectedCol }) => {
            const result = getRowColFromXY(x, y, squareSize, false);

            expect(result).toEqual({ row: expectedRow, col: expectedCol });
        });
    });

    describe('Flipped Board', () => {
        it('returns correct row/col for top-left square when flipped', () => {
            const result = getRowColFromXY(0, 0, 50, true);

            expect(result).toEqual({ row: 7, col: 7 });
        });

        it('returns correct row/col for bottom-right square when flipped', () => {
            const result = getRowColFromXY(350, 350, 50, true);

            expect(result).toEqual({ row: 0, col: 0 });
        });

        it('returns correct row/col for center square when flipped', () => {
            const result = getRowColFromXY(175, 175, 50, true);

            expect(result).toEqual({ row: 4, col: 4 });
        });

        it.each([
            {
                scenario: 'top-left (0,0)',
                x: 0,
                y: 0,
                notFlippedRow: 0,
                notFlippedCol: 0,
                flippedRow: 7,
                flippedCol: 7,
            },
            {
                scenario: 'top-right (7,0)',
                x: 350,
                y: 0,
                notFlippedRow: 0,
                notFlippedCol: 7,
                flippedRow: 7,
                flippedCol: 0,
            },
            {
                scenario: 'bottom-left (0,7)',
                x: 0,
                y: 350,
                notFlippedRow: 7,
                notFlippedCol: 0,
                flippedRow: 0,
                flippedCol: 7,
            },
            {
                scenario: 'bottom-right (7,7)',
                x: 350,
                y: 350,
                notFlippedRow: 7,
                notFlippedCol: 7,
                flippedRow: 0,
                flippedCol: 0,
            },
            {
                scenario: 'center (3,3)',
                x: 150,
                y: 150,
                notFlippedRow: 3,
                notFlippedCol: 3,
                flippedRow: 4,
                flippedCol: 4,
            },
            {
                scenario: 'middle (4,2)',
                x: 100,
                y: 200,
                notFlippedRow: 4,
                notFlippedCol: 2,
                flippedRow: 3,
                flippedCol: 5,
            },
        ])(
            'inverts both row and column correctly when flipped ($scenario)',
            ({ x, y, notFlippedRow, notFlippedCol, flippedRow, flippedCol }) => {
                const notFlippedResult = getRowColFromXY(x, y, 50, false);
                expect(notFlippedResult).toEqual({ row: notFlippedRow, col: notFlippedCol });

                const flippedResult = getRowColFromXY(x, y, 50, true);
                expect(flippedResult).toEqual({ row: flippedRow, col: flippedCol });

                // Verify the (7-row, 7-col) transformation
                expect(flippedResult.row).toBe(7 - notFlippedResult.row);
                expect(flippedResult.col).toBe(7 - notFlippedResult.col);
            }
        );
    });

    describe('Edge Cases', () => {
        it('handles fractional coordinates', () => {
            const result = getRowColFromXY(125.7, 225.3, 50, false);

            expect(result).toEqual({ row: 4, col: 2 });
        });

        it('handles zero square size gracefully', () => {
            const result = getRowColFromXY(100, 150, 0, false);

            expect(result.row).toBe(Infinity);
            expect(result.col).toBe(Infinity);
        });

        it('handles negative coordinates', () => {
            const result = getRowColFromXY(-10, -20, 50, false);

            expect(result).toEqual({ row: -1, col: -1 });
        });

        it('handles coordinates beyond board bounds', () => {
            const result = getRowColFromXY(500, 600, 50, false);

            expect(result).toEqual({ row: 12, col: 10 });
        });
    });
});

describe('xyFromPointerEvent', () => {
    describe('Basic Functionality', () => {
        it('returns correct x,y for pointer at element origin', () => {
            const event = { clientX: 100, clientY: 150 } as PointerEvent<HTMLDivElement>;
            const rect = { left: 100, top: 150 } as DOMRect;

            const result = xyFromPointerEvent(event, rect);

            expect(result).toEqual({ x: 0, y: 0 });
        });

        it('returns correct x,y for pointer offset from element origin', () => {
            const event = { clientX: 250, clientY: 300 } as PointerEvent<HTMLDivElement>;
            const rect = { left: 100, top: 150 } as DOMRect;

            const result = xyFromPointerEvent(event, rect);

            expect(result).toEqual({ x: 150, y: 150 });
        });

        it('handles pointer at bottom-right of element', () => {
            const event = { clientX: 500, clientY: 600 } as PointerEvent<HTMLDivElement>;
            const rect = { left: 100, top: 150 } as DOMRect;

            const result = xyFromPointerEvent(event, rect);

            expect(result).toEqual({ x: 400, y: 450 });
        });
    });

    describe('Edge Cases', () => {
        it('handles negative offsets (pointer before element)', () => {
            const event = { clientX: 50, clientY: 100 } as PointerEvent<HTMLDivElement>;
            const rect = { left: 100, top: 150 } as DOMRect;

            const result = xyFromPointerEvent(event, rect);

            expect(result).toEqual({ x: -50, y: -50 });
        });

        it('handles zero coordinates', () => {
            const event = { clientX: 0, clientY: 0 } as PointerEvent<HTMLDivElement>;
            const rect = { left: 0, top: 0 } as DOMRect;

            const result = xyFromPointerEvent(event, rect);

            expect(result).toEqual({ x: 0, y: 0 });
        });

        it('handles fractional pixel values', () => {
            const event = { clientX: 100.5, clientY: 200.7 } as PointerEvent<HTMLDivElement>;
            const rect = { left: 50.3, top: 100.2 } as DOMRect;

            const result = xyFromPointerEvent(event, rect);

            expect(result.x).toBeCloseTo(50.2, 10);
            expect(result.y).toBeCloseTo(100.5, 10);
        });

        it('works with both HTMLDivElement and HTMLImageElement events', () => {
            const rect = { left: 100, top: 150 } as DOMRect;

            const divEvent = { clientX: 250, clientY: 300 } as PointerEvent<HTMLDivElement>;
            const divResult = xyFromPointerEvent(divEvent, rect);
            expect(divResult).toEqual({ x: 150, y: 150 });

            const imgEvent = { clientX: 250, clientY: 300 } as PointerEvent<HTMLImageElement>;
            const imgResult = xyFromPointerEvent(imgEvent, rect);
            expect(imgResult).toEqual({ x: 150, y: 150 });
        });
    });
});
