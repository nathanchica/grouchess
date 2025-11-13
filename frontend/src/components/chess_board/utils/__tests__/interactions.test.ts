import type { PieceColor } from '@grouchess/models';
import { createMockBoardIndex, createMockChessBoard, createMockMove, createMockPiece } from '@grouchess/test-utils';

import { calculateGhostPieceTransform, calculateSelectedPieceAndGlowingSquares } from '../interactions';

describe('calculateGhostPieceTransform', () => {
    it.each([
        {
            scenario: 'centers ghost piece at pointer position with standard square size',
            squareSize: 60,
            x: 100,
            y: 200,
            expected: 'translate(70px, 170px)',
        },
        {
            scenario: 'handles zero coordinates',
            squareSize: 60,
            x: 0,
            y: 0,
            expected: 'translate(-30px, -30px)',
        },
        {
            scenario: 'handles different square sizes with smaller squares',
            squareSize: 40,
            x: 80,
            y: 160,
            expected: 'translate(60px, 140px)',
        },
        {
            scenario: 'handles different square sizes with larger squares',
            squareSize: 100,
            x: 200,
            y: 300,
            expected: 'translate(150px, 250px)',
        },
        {
            scenario: 'handles fractional coordinates',
            squareSize: 60,
            x: 125.5,
            y: 250.75,
            expected: 'translate(95.5px, 220.75px)',
        },
        {
            scenario: 'handles fractional square size',
            squareSize: 62.5,
            x: 100,
            y: 200,
            expected: 'translate(68.75px, 168.75px)',
        },
        {
            scenario: 'handles negative coordinates',
            squareSize: 60,
            x: -50,
            y: -100,
            expected: 'translate(-80px, -130px)',
        },
    ])('$scenario', ({ squareSize, x, y, expected }) => {
        const result = calculateGhostPieceTransform(squareSize, x, y);
        expect(result).toBe(expected);
    });
});

describe('calculateSelectedPieceAndGlowingSquares', () => {
    describe('Selection state', () => {
        it('returns null selectedPiece when selectedIndex is null', () => {
            const board = createMockChessBoard({ 52: 'P' });
            const { selectedPiece, indexToMoveDataForSelectedPiece } = calculateSelectedPieceAndGlowingSquares(
                board,
                [],
                undefined,
                null,
                []
            );

            expect(selectedPiece).toBeNull();
            expect(indexToMoveDataForSelectedPiece).toEqual({});
        });

        it('returns selected piece when selectedIndex is valid', () => {
            const board = createMockChessBoard({ 52: 'P', 12: 'n' });
            const selectedIndex = 52;
            const { selectedPiece } = calculateSelectedPieceAndGlowingSquares(board, [], undefined, selectedIndex, []);

            expect(selectedPiece).toEqual(createMockPiece({ alias: 'P', color: 'white', type: 'pawn', value: 1 }));
        });

        it('builds indexToMoveDataForSelectedPiece map correctly', () => {
            const board = createMockChessBoard({ 52: 'P' });
            const selectedIndex = 52;
            const legalMoves = [
                createMockMove({
                    startIndex: createMockBoardIndex(52),
                    endIndex: createMockBoardIndex(44),
                    type: 'standard',
                }),
                createMockMove({
                    startIndex: createMockBoardIndex(52),
                    endIndex: createMockBoardIndex(36),
                    type: 'standard',
                }),
                createMockMove({
                    startIndex: createMockBoardIndex(52),
                    endIndex: createMockBoardIndex(43),
                    type: 'capture',
                }),
            ];

            const { indexToMoveDataForSelectedPiece } = calculateSelectedPieceAndGlowingSquares(
                board,
                [],
                undefined,
                selectedIndex,
                legalMoves
            );

            expect(indexToMoveDataForSelectedPiece).toEqual({
                44: legalMoves[0],
                36: legalMoves[1],
                43: legalMoves[2],
            });
        });
    });

    describe('Previous move highlighting', () => {
        it('marks previous move indices with isPreviousMove', () => {
            const board = createMockChessBoard({ 52: 'P' });
            const previousMoveIndices = [60, 52];

            const { baseGlowingSquarePropsByIndex } = calculateSelectedPieceAndGlowingSquares(
                board,
                previousMoveIndices,
                undefined,
                null,
                []
            );

            expect(baseGlowingSquarePropsByIndex[60]).toEqual({ isPreviousMove: true });
            expect(baseGlowingSquarePropsByIndex[52]).toEqual({ isPreviousMove: true });
        });

        it('handles legal move square that is also a previous move square', () => {
            const board = createMockChessBoard({ 52: 'P' });
            const selectedIndex = 52;
            const previousMoveIndices = [60, 44];
            const legalMoves = [
                createMockMove({
                    startIndex: createMockBoardIndex(52),
                    endIndex: createMockBoardIndex(44),
                    type: 'standard',
                }),
            ];

            const { baseGlowingSquarePropsByIndex } = calculateSelectedPieceAndGlowingSquares(
                board,
                previousMoveIndices,
                undefined,
                selectedIndex,
                legalMoves
            );

            expect(baseGlowingSquarePropsByIndex[44]).toEqual({
                isPreviousMove: true,
                canMove: true,
            });
            expect(baseGlowingSquarePropsByIndex[60]).toEqual({ isPreviousMove: true });
        });
    });

    describe('Check highlighting', () => {
        it('marks king square with isCheck when king is in check', () => {
            const board = createMockChessBoard({ 60: 'K', 4: 'k' });
            const checkedColor: PieceColor = 'white';

            const { baseGlowingSquarePropsByIndex } = calculateSelectedPieceAndGlowingSquares(
                board,
                [],
                checkedColor,
                null,
                []
            );

            expect(baseGlowingSquarePropsByIndex[60]).toEqual({ isCheck: true });
        });

        it('does not mark isCheck when no king is in check', () => {
            const board = createMockChessBoard({ 60: 'K', 4: 'k' });

            const { baseGlowingSquarePropsByIndex } = calculateSelectedPieceAndGlowingSquares(
                board,
                [],
                undefined,
                null,
                []
            );

            expect(baseGlowingSquarePropsByIndex[60]).toBeUndefined();
            expect(baseGlowingSquarePropsByIndex[4]).toBeUndefined();
        });

        it('handles king in check with previous move overlap', () => {
            const board = createMockChessBoard({ 60: 'K', 4: 'k' });
            const checkedColor: PieceColor = 'white';
            const previousMoveIndices = [60, 52];

            const { baseGlowingSquarePropsByIndex } = calculateSelectedPieceAndGlowingSquares(
                board,
                previousMoveIndices,
                checkedColor,
                null,
                []
            );

            expect(baseGlowingSquarePropsByIndex[60]).toEqual({
                isPreviousMove: true,
                isCheck: true,
            });
            expect(baseGlowingSquarePropsByIndex[52]).toEqual({ isPreviousMove: true });
        });
    });

    describe('Selection highlighting', () => {
        it('marks selected square with isSelected', () => {
            const board = createMockChessBoard({ 52: 'P' });
            const selectedIndex = 52;

            const { baseGlowingSquarePropsByIndex } = calculateSelectedPieceAndGlowingSquares(
                board,
                [],
                undefined,
                selectedIndex,
                []
            );

            expect(baseGlowingSquarePropsByIndex[52]).toEqual({ isSelected: true });
        });
    });

    describe('Legal move highlighting', () => {
        it('marks legal move squares with canMove', () => {
            const board = createMockChessBoard({ 52: 'P' });
            const selectedIndex = 52;
            const legalMoves = [
                createMockMove({
                    startIndex: createMockBoardIndex(52),
                    endIndex: createMockBoardIndex(44),
                    type: 'standard',
                }),
                createMockMove({
                    startIndex: createMockBoardIndex(52),
                    endIndex: createMockBoardIndex(36),
                    type: 'standard',
                }),
            ];

            const { baseGlowingSquarePropsByIndex } = calculateSelectedPieceAndGlowingSquares(
                board,
                [],
                undefined,
                selectedIndex,
                legalMoves
            );

            expect(baseGlowingSquarePropsByIndex[44]).toEqual({ canMove: true });
            expect(baseGlowingSquarePropsByIndex[36]).toEqual({ canMove: true });
        });

        it('marks capture move squares with canCapture', () => {
            const board = createMockChessBoard({ 52: 'P', 43: 'n', 45: 'b' });
            const selectedIndex = 52;
            const legalMoves = [
                createMockMove({
                    startIndex: createMockBoardIndex(52),
                    endIndex: createMockBoardIndex(43),
                    type: 'capture',
                }),
                createMockMove({
                    startIndex: createMockBoardIndex(52),
                    endIndex: createMockBoardIndex(45),
                    type: 'capture',
                }),
            ];

            const { baseGlowingSquarePropsByIndex } = calculateSelectedPieceAndGlowingSquares(
                board,
                [],
                undefined,
                selectedIndex,
                legalMoves
            );

            expect(baseGlowingSquarePropsByIndex[43]).toEqual({ canCapture: true });
            expect(baseGlowingSquarePropsByIndex[45]).toEqual({ canCapture: true });
        });
    });
});
