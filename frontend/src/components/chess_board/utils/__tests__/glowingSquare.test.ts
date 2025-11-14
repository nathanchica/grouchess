import * as chessModule from '@grouchess/chess';
import type { BoardIndex, ChessBoardType, Move, PieceColor } from '@grouchess/models';
import { createMockMove } from '@grouchess/test-utils';

import type { GlowingSquarePropsByIndex } from '../../../../utils/types';
import { calculateGlowingSquares, updateGlowingSquaresForDragOver } from '../glowingSquare';

vi.mock('@grouchess/chess', () => ({
    getKingIndices: vi.fn(),
}));

describe('calculateGlowingSquares', () => {
    const mockBoard: ChessBoardType = Array(64).fill(null);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns empty object when no parameters are set', () => {
        vi.spyOn(chessModule, 'getKingIndices').mockReturnValue({ white: 4, black: 60 });

        const result = calculateGlowingSquares(mockBoard, [], undefined, null, []);

        expect(result).toEqual({});
    });

    describe('previous move highlighting', () => {
        it.each<{
            scenario: string;
            previousMoveIndices: BoardIndex[];
            expected: GlowingSquarePropsByIndex;
        }>([
            {
                scenario: 'single previous move index',
                previousMoveIndices: [12],
                expected: { 12: { isPreviousMove: true } },
            },
            {
                scenario: 'multiple previous move indices',
                previousMoveIndices: [8, 16],
                expected: {
                    8: { isPreviousMove: true },
                    16: { isPreviousMove: true },
                },
            },
            {
                scenario: 'empty previous move indices',
                previousMoveIndices: [],
                expected: {},
            },
        ])('marks $scenario correctly', ({ previousMoveIndices, expected }) => {
            vi.spyOn(chessModule, 'getKingIndices').mockReturnValue({ white: 4, black: 60 });

            const result = calculateGlowingSquares(mockBoard, previousMoveIndices, undefined, null, []);

            expect(result).toEqual(expected);
        });
    });

    describe('check highlighting', () => {
        it.each<{
            scenario: string;
            checkedColor: PieceColor;
            kingIndices: { white: BoardIndex; black: BoardIndex };
            expectedIndex: BoardIndex;
        }>([
            {
                scenario: 'white king in check',
                checkedColor: 'white' as PieceColor,
                kingIndices: { white: 4, black: 60 },
                expectedIndex: 4,
            },
            {
                scenario: 'black king in check',
                checkedColor: 'black' as PieceColor,
                kingIndices: { white: 4, black: 60 },
                expectedIndex: 60,
            },
        ])('marks $scenario', ({ checkedColor, kingIndices, expectedIndex }) => {
            vi.spyOn(chessModule, 'getKingIndices').mockReturnValue(kingIndices);

            const result = calculateGlowingSquares(mockBoard, [], checkedColor, null, []);

            expect(result).toEqual({
                [expectedIndex]: { isCheck: true },
            });
        });

        it('does not mark check when checkedColor is undefined', () => {
            const getKingIndicesSpy = vi.spyOn(chessModule, 'getKingIndices');

            const result = calculateGlowingSquares(mockBoard, [], undefined, null, []);

            expect(result).toEqual({});
            expect(getKingIndicesSpy).not.toHaveBeenCalled();
        });
    });

    describe('legal move highlighting', () => {
        it.each<{
            scenario: string;
            moves: Move[];
            expected: GlowingSquarePropsByIndex;
        }>([
            {
                scenario: 'regular move',
                moves: [createMockMove({ startIndex: 8, endIndex: 16, type: 'standard' })],
                expected: { 16: { canMove: true } },
            },
            {
                scenario: 'capture move',
                moves: [createMockMove({ startIndex: 8, endIndex: 17, type: 'capture' })],
                expected: { 17: { canCapture: true } },
            },
            {
                scenario: 'multiple regular moves',
                moves: [
                    createMockMove({ startIndex: 8, endIndex: 16, type: 'standard' }),
                    createMockMove({ startIndex: 8, endIndex: 24, type: 'standard' }),
                ],
                expected: {
                    16: { canMove: true },
                    24: { canMove: true },
                },
            },
            {
                scenario: 'multiple capture moves',
                moves: [
                    createMockMove({ startIndex: 8, endIndex: 17, type: 'capture' }),
                    createMockMove({ startIndex: 8, endIndex: 1, type: 'capture' }),
                ],
                expected: {
                    17: { canCapture: true },
                    1: { canCapture: true },
                },
            },
            {
                scenario: 'mixed move types',
                moves: [
                    createMockMove({ startIndex: 8, endIndex: 16, type: 'standard' }),
                    createMockMove({ startIndex: 8, endIndex: 17, type: 'capture' }),
                ],
                expected: {
                    16: { canMove: true },
                    17: { canCapture: true },
                },
            },
            {
                scenario: 'empty moves array',
                moves: [],
                expected: {},
            },
        ])('marks $scenario', ({ moves, expected }) => {
            vi.spyOn(chessModule, 'getKingIndices').mockReturnValue({ white: 4, black: 60 });

            const result = calculateGlowingSquares(mockBoard, [], undefined, null, moves);

            expect(result).toEqual(expected);
        });
    });

    describe('selected square highlighting', () => {
        it.each<{
            scenario: string;
            selectedIndex: BoardIndex | null;
            expected: GlowingSquarePropsByIndex;
        }>([
            {
                scenario: 'valid selected index',
                selectedIndex: 8,
                expected: { 8: { isSelected: true } },
            },
            {
                scenario: 'null selected index',
                selectedIndex: null,
                expected: {},
            },
        ])('marks $scenario', ({ selectedIndex, expected }) => {
            vi.spyOn(chessModule, 'getKingIndices').mockReturnValue({ white: 4, black: 60 });

            const result = calculateGlowingSquares(mockBoard, [], undefined, selectedIndex, []);

            expect(result).toEqual(expected);
        });
    });

    describe('combined highlighting', () => {
        it('combines previous move and check on same square', () => {
            vi.spyOn(chessModule, 'getKingIndices').mockReturnValue({ white: 4, black: 60 });

            const result = calculateGlowingSquares(mockBoard, [4], 'white', null, []);

            expect(result).toEqual({
                4: { isPreviousMove: true, isCheck: true },
            });
        });

        it('combines previous move and legal move on same square', () => {
            vi.spyOn(chessModule, 'getKingIndices').mockReturnValue({ white: 4, black: 60 });

            const result = calculateGlowingSquares(mockBoard, [16], undefined, null, [
                createMockMove({ startIndex: 8, endIndex: 16, type: 'standard' }),
            ]);

            expect(result).toEqual({
                16: { isPreviousMove: true, canMove: true },
            });
        });

        it('combines previous move and capture on same square', () => {
            vi.spyOn(chessModule, 'getKingIndices').mockReturnValue({ white: 4, black: 60 });

            const result = calculateGlowingSquares(mockBoard, [17], undefined, null, [
                createMockMove({ startIndex: 8, endIndex: 17, type: 'capture' }),
            ]);

            expect(result).toEqual({
                17: { isPreviousMove: true, canCapture: true },
            });
        });

        it('combines selection and legal move on same square', () => {
            vi.spyOn(chessModule, 'getKingIndices').mockReturnValue({ white: 4, black: 60 });

            const result = calculateGlowingSquares(mockBoard, [], undefined, 8, [
                createMockMove({ startIndex: 8, endIndex: 16, type: 'standard' }),
            ]);

            expect(result).toEqual({
                8: { isSelected: true },
                16: { canMove: true },
            });
        });

        it('combines all properties on different squares', () => {
            vi.spyOn(chessModule, 'getKingIndices').mockReturnValue({ white: 4, black: 60 });

            const result = calculateGlowingSquares(mockBoard, [12, 20], 'white', 8, [
                createMockMove({ startIndex: 8, endIndex: 16, type: 'standard' }),
                createMockMove({ startIndex: 8, endIndex: 17, type: 'capture' }),
            ]);

            expect(result).toEqual({
                12: { isPreviousMove: true },
                20: { isPreviousMove: true },
                4: { isCheck: true },
                8: { isSelected: true },
                16: { canMove: true },
                17: { canCapture: true },
            });
        });

        it('combines check, previous move, and selection on same square', () => {
            vi.spyOn(chessModule, 'getKingIndices').mockReturnValue({ white: 4, black: 60 });

            const result = calculateGlowingSquares(mockBoard, [4], 'white', 4, []);

            expect(result).toEqual({
                4: { isPreviousMove: true, isCheck: true, isSelected: true },
            });
        });

        it('combines all possible properties on same square', () => {
            vi.spyOn(chessModule, 'getKingIndices').mockReturnValue({ white: 4, black: 60 });

            const result = calculateGlowingSquares(mockBoard, [4], 'white', 4, [
                createMockMove({ startIndex: 0, endIndex: 4, type: 'capture' }),
            ]);

            expect(result).toEqual({
                4: { isPreviousMove: true, isCheck: true, isSelected: true, canCapture: true },
            });
        });
    });
});

describe('updateGlowingSquaresForDragOver', () => {
    it('returns empty object when input is empty', () => {
        const result = updateGlowingSquaresForDragOver({}, null);

        expect(result).toEqual({});
    });

    it('preserves existing properties when dragOverIndex is null', () => {
        const input: GlowingSquarePropsByIndex = {
            8: { isSelected: true },
            16: { canMove: true },
        };

        const result = updateGlowingSquaresForDragOver(input, null);

        expect(result).toEqual({
            8: { isSelected: true, isDraggingOver: false },
            16: { canMove: true, isDraggingOver: false },
        });
    });

    it.each<{
        scenario: string;
        input: GlowingSquarePropsByIndex;
        dragOverIndex: BoardIndex | null;
        expected: GlowingSquarePropsByIndex;
    }>([
        {
            scenario: 'single square with dragOverIndex',
            input: { 8: { isSelected: true } },
            dragOverIndex: 8,
            expected: { 8: { isSelected: true, isDraggingOver: true } },
        },
        {
            scenario: 'multiple squares with dragOverIndex on one',
            input: {
                8: { isSelected: true },
                16: { canMove: true },
                17: { canCapture: true },
            },
            dragOverIndex: 16,
            expected: {
                8: { isSelected: true, isDraggingOver: false },
                16: { canMove: true, isDraggingOver: true },
                17: { canCapture: true, isDraggingOver: false },
            },
        },
        {
            scenario: 'dragOverIndex not in existing squares',
            input: {
                8: { isSelected: true },
                16: { canMove: true },
            },
            dragOverIndex: 24,
            expected: {
                8: { isSelected: true, isDraggingOver: false },
                16: { canMove: true, isDraggingOver: false },
            },
        },
    ])('handles $scenario', ({ input, dragOverIndex, expected }) => {
        const result = updateGlowingSquaresForDragOver(input, dragOverIndex);

        expect(result).toEqual(expected);
    });

    it('does not mutate the input object', () => {
        const input: GlowingSquarePropsByIndex = {
            8: { isSelected: true },
            16: { canMove: true },
        };
        const inputCopy = JSON.parse(JSON.stringify(input));

        updateGlowingSquaresForDragOver(input, 16);

        expect(input).toEqual(inputCopy);
    });

    it('preserves all existing properties while adding isDraggingOver', () => {
        const input: GlowingSquarePropsByIndex = {
            8: {
                isSelected: true,
                isPreviousMove: true,
                isCheck: true,
                canMove: true,
                canCapture: true,
            },
        };

        const result = updateGlowingSquaresForDragOver(input, 8);

        expect(result).toEqual({
            8: {
                isSelected: true,
                isPreviousMove: true,
                isCheck: true,
                canMove: true,
                canCapture: true,
                isDraggingOver: true,
            },
        });
    });

    it('updates isDraggingOver when called multiple times with different indices', () => {
        const input: GlowingSquarePropsByIndex = {
            8: { isSelected: true },
            16: { canMove: true },
            17: { canCapture: true },
        };

        const result1 = updateGlowingSquaresForDragOver(input, 16);
        expect(result1[16].isDraggingOver).toBe(true);
        expect(result1[17].isDraggingOver).toBe(false);

        const result2 = updateGlowingSquaresForDragOver(result1, 17);
        expect(result2[16].isDraggingOver).toBe(false);
        expect(result2[17].isDraggingOver).toBe(true);
    });
});
