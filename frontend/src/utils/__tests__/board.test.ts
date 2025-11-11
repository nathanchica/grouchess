import type { PointerEvent } from 'react';

import { getRowColFromXY, xyFromPointerEvent } from '../board';

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
