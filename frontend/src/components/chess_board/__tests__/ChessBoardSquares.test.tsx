import * as chessModule from '@grouchess/chess';
import { NUM_SQUARES } from '@grouchess/models';
import { createMockChessBoard, createMockStartingChessBoard } from '@grouchess/test-utils';
import { render } from 'vitest-browser-react';

import { ImageContext, type ImageContextType } from '../../../providers/ImagesProvider';
import { createMockImageContextValues } from '../../../providers/__mocks__/ImagesProvider';
import ChessBoardSquares, { type ChessBoardSquaresProps } from '../ChessBoardSquares';
import * as glowingSquareModule from '../utils/glowingSquare';

vi.mock('../utils/glowingSquare', { spy: true });
vi.mock('@grouchess/chess', { spy: true });

const defaultProps: ChessBoardSquaresProps = {
    board: createMockChessBoard(),
    boardIsFlipped: false,
    pieceBeingDraggedIndex: null,
    dragOverIndex: null,
    previousMoveIndices: [],
    checkedColor: undefined,
    selectedIndex: null,
    legalMovesForSelectedPieceByEndIndex: {},
};

type RenderChessBoardSquaresOptions = {
    propOverrides?: Partial<ChessBoardSquaresProps>;
    imageContextValues?: ImageContextType;
};

function renderChessBoardSquares({
    propOverrides = {},
    imageContextValues = createMockImageContextValues({ isReady: true }),
}: RenderChessBoardSquaresOptions = {}) {
    return render(
        <ImageContext.Provider value={imageContextValues}>
            <ChessBoardSquares {...defaultProps} {...propOverrides} />
        </ImageContext.Provider>
    );
}

describe('ChessBoardSquares', () => {
    beforeEach(() => {
        vi.spyOn(glowingSquareModule, 'calculateGlowingSquares').mockReturnValue({});
        vi.spyOn(glowingSquareModule, 'updateGlowingSquaresForDragOver').mockReturnValue({});
        vi.spyOn(chessModule, 'getPiece').mockImplementation((alias) => ({
            alias,
            color: alias === alias.toUpperCase() ? 'white' : 'black',
            type: 'pawn',
            value: 1,
        }));
    });

    describe('Basic Rendering', () => {
        it('renders exactly 64 ChessSquare components', async () => {
            const { getByRole } = await renderChessBoardSquares();

            const squares = getByRole('gridcell').elements();
            expect(squares.length).toBe(NUM_SQUARES);
        });

        it('renders empty board with no pieces', async () => {
            const emptyBoard = createMockChessBoard();
            const { getByRole } = await renderChessBoardSquares({
                propOverrides: { board: emptyBoard },
            });

            const squares = getByRole('gridcell').elements();
            expect(squares.length).toBe(NUM_SQUARES);

            // Check that no squares contain images (pieces)
            const images = getByRole('img', { includeHidden: true }).elements();
            expect(images.length).toBe(0);
        });

        it('renders starting position with all 32 pieces', async () => {
            const startingBoard = createMockStartingChessBoard();
            const { getByRole } = await renderChessBoardSquares({
                propOverrides: { board: startingBoard },
            });

            const images = getByRole('img').elements();
            expect(images.length).toBe(32);
        });

        it('renders partial board with some pieces', async () => {
            const partialBoard = createMockChessBoard({
                0: 'r', // Black rook on a8
                7: 'k', // Black king on h8
                56: 'K', // White king on a1
                63: 'R', // White rook on h1
            });
            const { getByRole } = await renderChessBoardSquares({
                propOverrides: { board: partialBoard },
            });

            const images = getByRole('img').elements();
            expect(images.length).toBe(4);
        });
    });

    describe('Image Loading States', () => {
        it('hides all pieces when images are not ready', async () => {
            const startingBoard = createMockStartingChessBoard();
            const { getByRole } = await renderChessBoardSquares({
                propOverrides: { board: startingBoard },
                imageContextValues: createMockImageContextValues({ isReady: false }),
            });

            // Board should still have 64 squares
            const squares = getByRole('gridcell').elements();
            expect(squares.length).toBe(NUM_SQUARES);

            // But no pieces should be visible
            const images = getByRole('img', { includeHidden: true }).elements();
            expect(images.length).toBe(0);
        });

        it('shows all pieces when images finish loading', async () => {
            const startingBoard = createMockStartingChessBoard();
            const { getByRole } = await renderChessBoardSquares({
                propOverrides: { board: startingBoard },
                imageContextValues: createMockImageContextValues({ isReady: true }),
            });

            const images = getByRole('img').elements();
            expect(images.length).toBe(32);
        });

        it('transitions from loading to ready state', async () => {
            const startingBoard = createMockStartingChessBoard();
            const { getByRole, rerender } = await renderChessBoardSquares({
                propOverrides: { board: startingBoard },
                imageContextValues: createMockImageContextValues({ isReady: false }),
            });

            // Initially no pieces visible
            let images = getByRole('img', { includeHidden: true }).elements();
            expect(images.length).toBe(0);

            // After images are ready, all pieces should be visible
            await rerender(
                <ImageContext.Provider value={createMockImageContextValues({ isReady: true })}>
                    <ChessBoardSquares {...defaultProps} board={startingBoard} />
                </ImageContext.Provider>
            );

            images = getByRole('img').elements();
            expect(images.length).toBe(32);
        });
    });

    describe('Board Flipping Behavior', () => {
        // Board representation from docs/Board.md:
        // Non-flipped (white perspective): a8 is at index 0, h1 is at index 63
        // Flipped (black perspective): visual index 0 shows board index 63 (h1), visual index 63 shows board index 0 (a8)

        it('non-flipped board renders a8 square (index 0) at first visual position', async () => {
            const { getByRole } = await renderChessBoardSquares({
                propOverrides: { boardIsFlipped: false },
            });

            const squares = getByRole('gridcell').elements();
            const firstSquare = squares[0];

            await expect.element(firstSquare).toHaveAccessibleName('a8');
        });

        it('flipped board renders h1 square (index 63) at first visual position', async () => {
            const { getByRole } = await renderChessBoardSquares({
                propOverrides: { boardIsFlipped: true },
            });

            const squares = getByRole('gridcell').elements();
            const firstSquare = squares[0];

            await expect.element(firstSquare).toHaveAccessibleName('h1');
        });

        it('non-flipped board renders h1 square (index 63) at last visual position', async () => {
            const { getByRole } = await renderChessBoardSquares({
                propOverrides: { boardIsFlipped: false },
            });

            const squares = getByRole('gridcell').elements();
            const lastSquare = squares[63];

            await expect.element(lastSquare).toHaveAccessibleName('h1');
        });

        it('flipped board renders a8 square (index 0) at last visual position', async () => {
            const { getByRole } = await renderChessBoardSquares({
                propOverrides: { boardIsFlipped: true },
            });

            const squares = getByRole('gridcell').elements();
            const lastSquare = squares[63];

            await expect.element(lastSquare).toHaveAccessibleName('a8');
        });
    });

    describe('Piece Visibility and Drag State', () => {
        it('hides piece at dragged index during drag', async () => {
            const boardWithPiece = createMockChessBoard({
                36: 'P', // White pawn on e4
            });
            const { getByRole } = await renderChessBoardSquares({
                propOverrides: {
                    board: boardWithPiece,
                    pieceBeingDraggedIndex: 36,
                },
            });

            // Piece at dragged index should be hidden
            const images = getByRole('img', { includeHidden: true }).elements();
            expect(images.length).toBe(0);
        });

        it('shows pieces at all non-dragged indices during drag', async () => {
            const boardWithPieces = createMockChessBoard({
                36: 'P', // White pawn on e4
                28: 'p', // Black pawn on e5
                52: 'K', // White king on e2
            });
            const { getByRole } = await renderChessBoardSquares({
                propOverrides: {
                    board: boardWithPieces,
                    pieceBeingDraggedIndex: 36, // Dragging e4 pawn
                },
            });

            // Should show 2 pieces (e5 and e2, but not the dragged e4)
            const images = getByRole('img').elements();
            expect(images.length).toBe(2);
        });

        it('shows all pieces when no piece is being dragged', async () => {
            const boardWithPieces = createMockChessBoard({
                36: 'P',
                28: 'p',
                52: 'K',
            });
            const { getByRole } = await renderChessBoardSquares({
                propOverrides: {
                    board: boardWithPieces,
                    pieceBeingDraggedIndex: null,
                },
            });

            const images = getByRole('img').elements();
            expect(images.length).toBe(3);
        });

        it('shows previously dragged piece after drag ends', async () => {
            const boardWithPiece = createMockChessBoard({
                36: 'P',
            });
            const { getByRole, rerender } = await renderChessBoardSquares({
                propOverrides: {
                    board: boardWithPiece,
                    pieceBeingDraggedIndex: 36,
                },
            });

            // Initially hidden during drag
            let images = getByRole('img', { includeHidden: true }).elements();
            expect(images.length).toBe(0);

            // After drag ends, piece should be visible
            await rerender(
                <ImageContext.Provider value={createMockImageContextValues({ isReady: true })}>
                    <ChessBoardSquares {...defaultProps} board={boardWithPiece} pieceBeingDraggedIndex={null} />
                </ImageContext.Provider>
            );

            images = getByRole('img').elements();
            expect(images.length).toBe(1);
        });

        it('handles dragging from empty square', async () => {
            const emptyBoard = createMockChessBoard();
            const { getByRole } = await renderChessBoardSquares({
                propOverrides: {
                    board: emptyBoard,
                    pieceBeingDraggedIndex: 36, // Attempting to drag from empty square
                },
            });

            // No pieces should be rendered
            const images = getByRole('img', { includeHidden: true }).elements();
            expect(images.length).toBe(0);
        });

        it('combines image loading and drag state correctly', async () => {
            const boardWithPieces = createMockChessBoard({
                36: 'P',
                28: 'p',
            });
            const { getByRole } = await renderChessBoardSquares({
                propOverrides: {
                    board: boardWithPieces,
                    pieceBeingDraggedIndex: 36,
                },
                imageContextValues: createMockImageContextValues({ isReady: false }),
            });

            // When images aren't ready, no pieces should show regardless of drag state
            const images = getByRole('img', { includeHidden: true }).elements();
            expect(images.length).toBe(0);
        });
    });

    describe('Glowing Square Visual Rendering', () => {
        it('applies glowing square props to correct squares', async () => {
            const mockGlowingSquares = {
                36: { isPreviousMove: true },
                28: { isSelected: true },
            };
            const calculateGlowingSpy = vi
                .spyOn(glowingSquareModule, 'calculateGlowingSquares')
                .mockReturnValue(mockGlowingSquares);
            const updateGlowingSpy = vi
                .spyOn(glowingSquareModule, 'updateGlowingSquaresForDragOver')
                .mockReturnValue(mockGlowingSquares);

            await renderChessBoardSquares({
                propOverrides: {
                    previousMoveIndices: [36],
                    selectedIndex: 28,
                },
            });

            expect(calculateGlowingSpy).toHaveBeenCalled();
            expect(updateGlowingSpy).toHaveBeenCalledWith(mockGlowingSquares, null);
        });

        it('updates glowing squares when drag over state changes', async () => {
            const baseGlowingSquares = {
                36: { isPreviousMove: true },
            };
            const updatedGlowingSquares = {
                36: { isPreviousMove: true, isDraggingOver: false },
                28: { isDraggingOver: true },
            };

            vi.spyOn(glowingSquareModule, 'calculateGlowingSquares').mockReturnValue(baseGlowingSquares);
            const updateGlowingSpy = vi
                .spyOn(glowingSquareModule, 'updateGlowingSquaresForDragOver')
                .mockReturnValue(updatedGlowingSquares);

            const { rerender } = await renderChessBoardSquares({
                propOverrides: { dragOverIndex: null },
            });

            expect(updateGlowingSpy).toHaveBeenCalledWith(baseGlowingSquares, null);

            await rerender(
                <ImageContext.Provider value={createMockImageContextValues({ isReady: true })}>
                    <ChessBoardSquares {...defaultProps} dragOverIndex={28} />
                </ImageContext.Provider>
            );

            expect(updateGlowingSpy).toHaveBeenCalledWith(baseGlowingSquares, 28);
        });
    });

    describe('Edge Cases and Boundary Conditions', () => {
        it('handles board with only one piece', async () => {
            const boardWithOnePiece = createMockChessBoard({
                36: 'K', // White king on e4
            });
            const { getByRole } = await renderChessBoardSquares({
                propOverrides: { board: boardWithOnePiece },
            });

            const squares = getByRole('gridcell').elements();
            expect(squares.length).toBe(NUM_SQUARES);

            const images = getByRole('img').elements();
            expect(images.length).toBe(1);
        });

        it('handles all pieces of same color', async () => {
            const boardWithWhitePieces = createMockChessBoard({
                0: 'R',
                1: 'N',
                2: 'B',
                3: 'Q',
            });
            const { getByRole } = await renderChessBoardSquares({
                propOverrides: { board: boardWithWhitePieces },
            });

            const images = getByRole('img').elements();
            expect(images.length).toBe(4);
        });

        it('handles dragOverIndex=0 (corner case index)', async () => {
            const updateGlowingSpy = vi.spyOn(glowingSquareModule, 'updateGlowingSquaresForDragOver');

            await renderChessBoardSquares({
                propOverrides: { dragOverIndex: 0 },
            });

            expect(updateGlowingSpy).toHaveBeenCalledWith(expect.anything(), 0);
        });

        it('handles pieceBeingDraggedIndex=0 (corner case index)', async () => {
            const boardWithPieceAtZero = createMockChessBoard({
                0: 'r', // Black rook on a8 (index 0)
            });
            const { getByRole } = await renderChessBoardSquares({
                propOverrides: {
                    board: boardWithPieceAtZero,
                    pieceBeingDraggedIndex: 0,
                },
            });

            const images = getByRole('img', { includeHidden: true }).elements();
            expect(images.length).toBe(0);
        });

        it('handles simultaneous drag and previous move on same square', async () => {
            const boardWithPiece = createMockChessBoard({
                36: 'P',
            });
            const mockGlowingSquares = {
                36: { isPreviousMove: true },
            };
            vi.spyOn(glowingSquareModule, 'calculateGlowingSquares').mockReturnValue(mockGlowingSquares);
            vi.spyOn(glowingSquareModule, 'updateGlowingSquaresForDragOver').mockReturnValue(mockGlowingSquares);

            const { getByRole } = await renderChessBoardSquares({
                propOverrides: {
                    board: boardWithPiece,
                    pieceBeingDraggedIndex: 36,
                    previousMoveIndices: [36],
                },
            });

            // The piece should be hidden during drag even if it's part of previous move
            const images = getByRole('img', { includeHidden: true }).elements();
            expect(images.length).toBe(0);
        });

        it('does not mutate original board array when flipping', async () => {
            const originalBoard = createMockChessBoard({
                0: 'r',
                63: 'R',
            });
            const boardCopy = [...originalBoard];

            await renderChessBoardSquares({
                propOverrides: {
                    board: originalBoard,
                    boardIsFlipped: true,
                },
            });

            // Original board should remain unchanged
            expect(originalBoard).toEqual(boardCopy);
            expect(originalBoard[0]).toBe('r');
            expect(originalBoard[63]).toBe('R');
        });
    });
});
