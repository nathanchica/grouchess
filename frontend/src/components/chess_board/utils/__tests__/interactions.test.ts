import type { RefObject } from 'react';

import {
    createMockBoardIndex,
    createMockChessBoard,
    createMockLegalMovesStore,
    createMockMove,
    createMockPiece,
} from '@grouchess/test-utils';

import type { DragProps } from '../../../../utils/types';
import { createMockDragProps, createMockPointerEvent } from '../__mocks__/interactions';
import * as boardModule from '../board';
import {
    calculateGhostPieceTransform,
    createPointerDownEventHandler,
    createPointerMoveEventHandler,
    createPointerUpEventHandler,
    getSelectedPieceData,
} from '../interactions';

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

describe('getSelectedPieceData', () => {
    it('returns null selectedPiece and empty map when selectedIndex is null', () => {
        const board = createMockChessBoard({ 52: 'P' });
        const legalMovesStore = createMockLegalMovesStore();

        const { selectedPiece, legalMovesForSelectedPieceByEndIndex } = getSelectedPieceData(
            board,
            null,
            legalMovesStore
        );

        expect(selectedPiece).toBeNull();
        expect(legalMovesForSelectedPieceByEndIndex).toEqual({});
    });

    it('returns selected piece when selectedIndex points to a piece', () => {
        const board = createMockChessBoard({ 52: 'P' });
        const legalMovesStore = createMockLegalMovesStore();

        const { selectedPiece } = getSelectedPieceData(board, 52, legalMovesStore);

        expect(selectedPiece).toEqual(createMockPiece({ alias: 'P', color: 'white', type: 'pawn', value: 1 }));
    });

    it('returns null selectedPiece when selectedIndex points to empty square', () => {
        const board = createMockChessBoard({ 52: null });
        const legalMovesStore = createMockLegalMovesStore();

        const { selectedPiece } = getSelectedPieceData(board, 52, legalMovesStore);

        expect(selectedPiece).toBeNull();
    });

    it('builds legalMovesForSelectedPieceByEndIndex map correctly', () => {
        const board = createMockChessBoard({ 52: 'P' });
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
        const legalMovesStore = createMockLegalMovesStore({
            byStartIndex: {
                '52': legalMoves,
            },
        });

        const { legalMovesForSelectedPieceByEndIndex } = getSelectedPieceData(board, 52, legalMovesStore);

        expect(legalMovesForSelectedPieceByEndIndex).toEqual({
            44: legalMoves[0],
            36: legalMoves[1],
            43: legalMoves[2],
        });
    });

    it('returns empty map when piece has no legal moves', () => {
        const board = createMockChessBoard({ 52: 'P' });
        const legalMovesStore = createMockLegalMovesStore({
            byStartIndex: {
                '52': [],
            },
        });

        const { legalMovesForSelectedPieceByEndIndex } = getSelectedPieceData(board, 52, legalMovesStore);

        expect(legalMovesForSelectedPieceByEndIndex).toEqual({});
    });

    it('returns empty map when piece has no entry in legalMovesStore', () => {
        const board = createMockChessBoard({ 52: 'P' });
        const legalMovesStore = createMockLegalMovesStore({
            byStartIndex: {},
        });

        const { legalMovesForSelectedPieceByEndIndex } = getSelectedPieceData(board, 52, legalMovesStore);

        expect(legalMovesForSelectedPieceByEndIndex).toEqual({});
    });
});

describe('createPointerDownEventHandler', () => {
    const boardRect = new DOMRect(0, 0, 480, 480);
    const squareSize = 60;

    type CreateHandlerParams = {
        boardRect?: DOMRect;
        boardInteractionIsDisabled?: boolean;
        boardIsFlipped?: boolean;
        board?: Parameters<typeof createPointerDownEventHandler>[3];
        playerTurn?: Parameters<typeof createPointerDownEventHandler>[4];
        selectedPiece?: Parameters<typeof createPointerDownEventHandler>[5];
        legalMovesForSelectedPieceByEndIndex?: Parameters<typeof createPointerDownEventHandler>[6];
        movePiece?: Parameters<typeof createPointerDownEventHandler>[7];
        clearSelection?: Parameters<typeof createPointerDownEventHandler>[8];
        selectIndex?: Parameters<typeof createPointerDownEventHandler>[9];
        startDrag?: Parameters<typeof createPointerDownEventHandler>[10];
    };

    function createHandler({
        boardRect: boardRectParam = boardRect,
        boardInteractionIsDisabled = false,
        boardIsFlipped = false,
        board = createMockChessBoard(),
        playerTurn = 'white',
        selectedPiece = null,
        legalMovesForSelectedPieceByEndIndex = {},
        movePiece = vi.fn(),
        clearSelection = vi.fn(),
        selectIndex = vi.fn(),
        startDrag = vi.fn(),
    }: CreateHandlerParams = {}) {
        return {
            handler: createPointerDownEventHandler(
                boardRectParam,
                boardInteractionIsDisabled,
                boardIsFlipped,
                board,
                playerTurn,
                selectedPiece,
                legalMovesForSelectedPieceByEndIndex,
                movePiece,
                clearSelection,
                selectIndex,
                startDrag
            ),
            mocks: { movePiece, clearSelection, selectIndex, startDrag },
        };
    }

    describe('when board interaction is disabled', () => {
        it('returns early without performing any actions', () => {
            const { handler, mocks } = createHandler({ boardInteractionIsDisabled: true });

            const event = createMockPointerEvent({ clientX: 100, clientY: 100 });
            handler(event);

            expect(mocks.movePiece).not.toHaveBeenCalled();
            expect(mocks.clearSelection).not.toHaveBeenCalled();
            expect(mocks.selectIndex).not.toHaveBeenCalled();
            expect(mocks.startDrag).not.toHaveBeenCalled();
        });
    });

    describe('when clicking out of bounds', () => {
        it('returns early without performing any actions', () => {
            vi.spyOn(boardModule, 'xyFromPointerEvent').mockReturnValue({ x: 100, y: 100 });
            vi.spyOn(boardModule, 'getSquareSizeFromBoardRect').mockReturnValue(squareSize);
            vi.spyOn(boardModule, 'getRowColFromXY').mockReturnValue({ row: -1, col: 0 }); // Out of bounds

            const { handler, mocks } = createHandler();

            const event = createMockPointerEvent({ clientX: 100, clientY: 100 });
            handler(event);

            expect(mocks.movePiece).not.toHaveBeenCalled();
            expect(mocks.clearSelection).not.toHaveBeenCalled();
            expect(mocks.selectIndex).not.toHaveBeenCalled();
            expect(mocks.startDrag).not.toHaveBeenCalled();
        });
    });

    describe('when clicking on a legal move square while a piece is selected', () => {
        it('executes the move and clears selection', () => {
            const move = createMockMove({ startIndex: 52, endIndex: 44 });
            const board = createMockChessBoard({ 52: 'P' });
            const selectedPiece = createMockPiece({ alias: 'P', color: 'white' });
            const legalMovesForSelectedPieceByEndIndex = { 44: move };

            vi.spyOn(boardModule, 'xyFromPointerEvent').mockReturnValue({ x: 240, y: 300 });
            vi.spyOn(boardModule, 'getSquareSizeFromBoardRect').mockReturnValue(squareSize);
            vi.spyOn(boardModule, 'getRowColFromXY').mockReturnValue({ row: 5, col: 4 }); // Index 44 = row 5, col 4

            const { handler, mocks } = createHandler({
                board,
                selectedPiece,
                legalMovesForSelectedPieceByEndIndex,
            });

            const event = createMockPointerEvent({ clientX: 240, clientY: 300 });
            handler(event);

            expect(mocks.movePiece).toHaveBeenCalledExactlyOnceWith(move);
            expect(mocks.clearSelection).toHaveBeenCalledOnce();
            expect(mocks.selectIndex).not.toHaveBeenCalled();
            expect(mocks.startDrag).not.toHaveBeenCalled();
        });
    });

    describe('when clicking on own piece', () => {
        it('selects the piece and starts drag', () => {
            const preventDefault = vi.fn();
            const stopPropagation = vi.fn();
            const board = createMockChessBoard({ 52: 'P' });

            vi.spyOn(boardModule, 'xyFromPointerEvent').mockReturnValue({ x: 240, y: 360 });
            vi.spyOn(boardModule, 'getSquareSizeFromBoardRect').mockReturnValue(squareSize);
            vi.spyOn(boardModule, 'getRowColFromXY').mockReturnValue({ row: 6, col: 4 });

            const { handler, mocks } = createHandler({
                board,
            });

            const event = createMockPointerEvent({
                pointerId: 5,
                clientX: 240,
                clientY: 360,
                preventDefault,
                stopPropagation,
            });
            handler(event);

            expect(preventDefault).toHaveBeenCalledOnce();
            expect(stopPropagation).toHaveBeenCalledOnce();
            expect(mocks.selectIndex).toHaveBeenCalledExactlyOnceWith(52);
            expect(mocks.startDrag).toHaveBeenCalledExactlyOnceWith({
                pointerId: 5,
                squareSize,
                boardRect,
                initialX: 240,
                initialY: 360,
            });
            expect(mocks.movePiece).not.toHaveBeenCalled();
            expect(mocks.clearSelection).not.toHaveBeenCalled();
        });
    });

    describe('when clicking on opponent piece (non-capture)', () => {
        it('does nothing', () => {
            const board = createMockChessBoard({ 8: 'p' }); // Black pawn

            vi.spyOn(boardModule, 'xyFromPointerEvent').mockReturnValue({ x: 0, y: 60 });
            vi.spyOn(boardModule, 'getSquareSizeFromBoardRect').mockReturnValue(squareSize);
            vi.spyOn(boardModule, 'getRowColFromXY').mockReturnValue({ row: 1, col: 0 });

            const { handler, mocks } = createHandler({ board });

            const event = createMockPointerEvent({ clientX: 0, clientY: 60 });
            handler(event);

            expect(mocks.movePiece).not.toHaveBeenCalled();
            expect(mocks.clearSelection).not.toHaveBeenCalled();
            expect(mocks.selectIndex).not.toHaveBeenCalled();
            expect(mocks.startDrag).not.toHaveBeenCalled();
        });
    });

    describe('when clicking on empty square (not a legal move)', () => {
        it('clears selection', () => {
            vi.spyOn(boardModule, 'xyFromPointerEvent').mockReturnValue({ x: 120, y: 180 });
            vi.spyOn(boardModule, 'getSquareSizeFromBoardRect').mockReturnValue(squareSize);
            vi.spyOn(boardModule, 'getRowColFromXY').mockReturnValue({ row: 3, col: 2 });

            const { handler, mocks } = createHandler();

            const event = createMockPointerEvent({ clientX: 120, clientY: 180 });
            handler(event);

            expect(mocks.clearSelection).toHaveBeenCalledOnce();
            expect(mocks.movePiece).not.toHaveBeenCalled();
            expect(mocks.selectIndex).not.toHaveBeenCalled();
            expect(mocks.startDrag).not.toHaveBeenCalled();
        });
    });

    describe('when board is flipped', () => {
        it('correctly handles coordinates', () => {
            const board = createMockChessBoard({ 8: 'P' }); // White pawn at index 8

            vi.spyOn(boardModule, 'xyFromPointerEvent').mockReturnValue({ x: 420, y: 420 });
            vi.spyOn(boardModule, 'getSquareSizeFromBoardRect').mockReturnValue(squareSize);
            vi.spyOn(boardModule, 'getRowColFromXY').mockReturnValue({ row: 1, col: 0 }); // Flipped coordinates

            const { handler, mocks } = createHandler({
                boardIsFlipped: true,
                board,
            });

            const event = createMockPointerEvent({ clientX: 420, clientY: 420 });
            handler(event);

            expect(mocks.selectIndex).toHaveBeenCalledWith(8);
        });
    });
});

describe('createPointerMoveEventHandler', () => {
    const boardRect = new DOMRect(0, 0, 480, 480);
    const squareSize = 60;

    function createMockGhostPieceRef(element: HTMLDivElement | null = null): RefObject<HTMLDivElement | null> {
        return { current: element };
    }

    function createMockGhostPieceElement(): HTMLDivElement {
        return {
            style: { transform: '' },
        } as unknown as HTMLDivElement;
    }

    type CreateHandlerParams = {
        ghostPieceRef?: RefObject<HTMLDivElement | null>;
        boardInteractionIsDisabled?: boolean;
        boardIsFlipped?: boolean;
        drag?: DragProps | null;
        dragOverIndex?: Parameters<typeof createPointerMoveEventHandler>[4];
        updateDragOverIndex?: Parameters<typeof createPointerMoveEventHandler>[5];
    };

    function createHandler({
        ghostPieceRef = createMockGhostPieceRef(createMockGhostPieceElement()),
        boardInteractionIsDisabled = false,
        boardIsFlipped = false,
        drag = createMockDragProps({ pointerId: 1, squareSize, boardRect }),
        dragOverIndex = null,
        updateDragOverIndex = vi.fn(),
    }: CreateHandlerParams = {}) {
        return {
            handler: createPointerMoveEventHandler(
                ghostPieceRef,
                boardInteractionIsDisabled,
                boardIsFlipped,
                drag,
                dragOverIndex,
                updateDragOverIndex
            ),
            mocks: { updateDragOverIndex },
            ghostPieceRef,
        };
    }

    describe('when board interaction is disabled', () => {
        it('returns early without performing any actions', () => {
            const { handler, mocks, ghostPieceRef } = createHandler({
                boardInteractionIsDisabled: true,
            });

            const event = createMockPointerEvent({ pointerId: 1, clientX: 100, clientY: 100 });
            handler(event);

            expect(mocks.updateDragOverIndex).not.toHaveBeenCalled();
            expect(ghostPieceRef.current?.style.transform).toBe('');
        });
    });

    describe('when drag is null', () => {
        it('returns early without performing any actions', () => {
            const { handler, mocks, ghostPieceRef } = createHandler({ drag: null });

            const event = createMockPointerEvent({ pointerId: 1, clientX: 100, clientY: 100 });
            handler(event);

            expect(mocks.updateDragOverIndex).not.toHaveBeenCalled();
            expect(ghostPieceRef.current?.style.transform).toBe('');
        });
    });

    describe('when ghost piece ref is null', () => {
        it('returns early without performing any actions', () => {
            const { handler, mocks } = createHandler({
                ghostPieceRef: createMockGhostPieceRef(null),
            });

            const event = createMockPointerEvent({ pointerId: 1, clientX: 100, clientY: 100 });
            handler(event);

            expect(mocks.updateDragOverIndex).not.toHaveBeenCalled();
        });
    });

    describe('when pointer ID does not match drag pointer ID', () => {
        it('returns early without performing any actions', () => {
            const { handler, mocks, ghostPieceRef } = createHandler({
                drag: createMockDragProps({ pointerId: 1 }),
            });

            const event = createMockPointerEvent({ pointerId: 2, clientX: 100, clientY: 100 }); // Different pointer ID
            handler(event);

            expect(mocks.updateDragOverIndex).not.toHaveBeenCalled();
            expect(ghostPieceRef.current?.style.transform).toBe('');
        });
    });

    describe('when dragging over a new square', () => {
        it('updates ghost piece position and drag over index', () => {
            vi.spyOn(boardModule, 'xyFromPointerEvent').mockReturnValue({ x: 180, y: 240 });
            vi.spyOn(boardModule, 'getRowColFromXY').mockReturnValue({ row: 4, col: 3 });

            const { handler, mocks, ghostPieceRef } = createHandler();

            const event = createMockPointerEvent({ pointerId: 1, clientX: 180, clientY: 240 });
            handler(event);

            expect(ghostPieceRef.current?.style.transform).toBe('translate(150px, 210px)');
            expect(mocks.updateDragOverIndex).toHaveBeenCalledExactlyOnceWith(35); // row 4, col 3 = index 35
        });
    });

    describe('when dragging over the same square', () => {
        it('updates ghost piece position but does not update drag over index', () => {
            vi.spyOn(boardModule, 'xyFromPointerEvent').mockReturnValue({ x: 185, y: 245 });
            vi.spyOn(boardModule, 'getRowColFromXY').mockReturnValue({ row: 4, col: 3 });

            const { handler, mocks, ghostPieceRef } = createHandler({
                dragOverIndex: 35, // dragOverIndex is already 35
            });

            const event = createMockPointerEvent({ pointerId: 1, clientX: 185, clientY: 245 });
            handler(event);

            expect(ghostPieceRef.current?.style.transform).toBe('translate(155px, 215px)');
            expect(mocks.updateDragOverIndex).not.toHaveBeenCalled();
        });
    });

    describe('when dragging out of bounds', () => {
        it('updates ghost piece position and sets drag over index to null', () => {
            vi.spyOn(boardModule, 'xyFromPointerEvent').mockReturnValue({ x: -10, y: 100 });
            vi.spyOn(boardModule, 'getRowColFromXY').mockReturnValue({ row: 1, col: -1 }); // Out of bounds

            const { handler, mocks, ghostPieceRef } = createHandler({
                dragOverIndex: 35, // dragOverIndex was 35
            });

            const event = createMockPointerEvent({ pointerId: 1, clientX: -10, clientY: 100 });
            handler(event);

            expect(ghostPieceRef.current?.style.transform).toBe('translate(-40px, 70px)');
            expect(mocks.updateDragOverIndex).toHaveBeenCalledExactlyOnceWith(null);
        });
    });

    describe('when board is flipped', () => {
        it('correctly handles coordinates', () => {
            vi.spyOn(boardModule, 'xyFromPointerEvent').mockReturnValue({ x: 420, y: 60 });
            vi.spyOn(boardModule, 'getRowColFromXY').mockReturnValue({ row: 7, col: 7 }); // Flipped coordinates

            const { handler, mocks } = createHandler({
                boardIsFlipped: true,
            });

            const event = createMockPointerEvent({ pointerId: 1, clientX: 420, clientY: 60 });
            handler(event);

            expect(mocks.updateDragOverIndex).toHaveBeenCalledWith(63); // row 7, col 7 = index 63
        });
    });
});

describe('createPointerUpEventHandler', () => {
    type CreateHandlerParams = {
        drag?: DragProps | null;
        dragOverIndex?: Parameters<typeof createPointerUpEventHandler>[1];
        selectedIndex?: Parameters<typeof createPointerUpEventHandler>[2];
        legalMovesForSelectedPieceByEndIndex?: Parameters<typeof createPointerUpEventHandler>[3];
        movePiece?: Parameters<typeof createPointerUpEventHandler>[4];
        clearSelection?: Parameters<typeof createPointerUpEventHandler>[5];
        clearDragStates?: Parameters<typeof createPointerUpEventHandler>[6];
    };

    function createHandler({
        drag = createMockDragProps({ pointerId: 1 }),
        dragOverIndex = null,
        selectedIndex = 52,
        legalMovesForSelectedPieceByEndIndex = {},
        movePiece = vi.fn(),
        clearSelection = vi.fn(),
        clearDragStates = vi.fn(),
    }: CreateHandlerParams = {}) {
        return {
            handler: createPointerUpEventHandler(
                drag,
                dragOverIndex,
                selectedIndex,
                legalMovesForSelectedPieceByEndIndex,
                movePiece,
                clearSelection,
                clearDragStates
            ),
            mocks: { movePiece, clearSelection, clearDragStates },
        };
    }

    describe('when drag is null', () => {
        it('returns early without performing any actions', () => {
            const { handler, mocks } = createHandler({ drag: null });

            const event = createMockPointerEvent({ pointerId: 1 });
            handler(event);

            expect(mocks.movePiece).not.toHaveBeenCalled();
            expect(mocks.clearSelection).not.toHaveBeenCalled();
            expect(mocks.clearDragStates).not.toHaveBeenCalled();
        });
    });

    describe('when pointer ID does not match drag pointer ID', () => {
        it('returns early without performing any actions', () => {
            const { handler, mocks } = createHandler({
                drag: createMockDragProps({ pointerId: 1 }),
            });

            const event = createMockPointerEvent({ pointerId: 2 }); // Different pointer ID
            handler(event);

            expect(mocks.movePiece).not.toHaveBeenCalled();
            expect(mocks.clearSelection).not.toHaveBeenCalled();
            expect(mocks.clearDragStates).not.toHaveBeenCalled();
        });
    });

    describe('when selected index is null', () => {
        it('returns early without performing any actions', () => {
            const { handler, mocks } = createHandler({ selectedIndex: null });

            const event = createMockPointerEvent({ pointerId: 1 });
            handler(event);

            expect(mocks.movePiece).not.toHaveBeenCalled();
            expect(mocks.clearSelection).not.toHaveBeenCalled();
            expect(mocks.clearDragStates).not.toHaveBeenCalled();
        });
    });

    describe('when pointer is released on the same square (no drag movement)', () => {
        it('only clears drag states without moving or clearing selection', () => {
            const { handler, mocks } = createHandler({
                dragOverIndex: 52, // same as selectedIndex
                selectedIndex: 52,
            });

            const event = createMockPointerEvent({ pointerId: 1 });
            handler(event);

            expect(mocks.clearDragStates).toHaveBeenCalledOnce();
            expect(mocks.movePiece).not.toHaveBeenCalled();
            expect(mocks.clearSelection).not.toHaveBeenCalled();
        });
    });

    describe('when dragOverIndex is null (dragged off board)', () => {
        it('uses selectedIndex as endIndex, clears drag states without moving', () => {
            const { handler, mocks } = createHandler({
                dragOverIndex: null,
                selectedIndex: 52,
            });

            const event = createMockPointerEvent({ pointerId: 1 });
            handler(event);

            // endIndex = dragOverIndex ?? selectedIndex = null ?? 52 = 52
            // endIndex === selectedIndex, so we're in the "same square" case
            expect(mocks.clearDragStates).toHaveBeenCalledOnce();
            expect(mocks.movePiece).not.toHaveBeenCalled();
            expect(mocks.clearSelection).not.toHaveBeenCalled();
        });
    });

    describe('when dragged to a legal move square', () => {
        it('executes the move, clears selection and drag states', () => {
            const move = createMockMove({ startIndex: 52, endIndex: 44 });
            const { handler, mocks } = createHandler({
                dragOverIndex: 44,
                selectedIndex: 52,
                legalMovesForSelectedPieceByEndIndex: { 44: move },
            });

            const event = createMockPointerEvent({ pointerId: 1 });
            handler(event);

            expect(mocks.movePiece).toHaveBeenCalledExactlyOnceWith(move);
            expect(mocks.clearSelection).toHaveBeenCalledOnce();
            expect(mocks.clearDragStates).toHaveBeenCalledOnce();
        });
    });

    describe('when dragged to a non-legal move square', () => {
        it('clears selection and drag states without moving', () => {
            const { handler, mocks } = createHandler({
                dragOverIndex: 36, // not in legal moves
                selectedIndex: 52,
                legalMovesForSelectedPieceByEndIndex: { 44: createMockMove() },
            });

            const event = createMockPointerEvent({ pointerId: 1 });
            handler(event);

            expect(mocks.movePiece).not.toHaveBeenCalled();
            expect(mocks.clearSelection).toHaveBeenCalledOnce();
            expect(mocks.clearDragStates).toHaveBeenCalledOnce();
        });
    });

    describe('when dragged to an empty legal moves map', () => {
        it('clears selection and drag states without moving', () => {
            const { handler, mocks } = createHandler({
                dragOverIndex: 44,
                selectedIndex: 52,
                legalMovesForSelectedPieceByEndIndex: {}, // no legal moves
            });

            const event = createMockPointerEvent({ pointerId: 1 });
            handler(event);

            expect(mocks.movePiece).not.toHaveBeenCalled();
            expect(mocks.clearSelection).toHaveBeenCalledOnce();
            expect(mocks.clearDragStates).toHaveBeenCalledOnce();
        });
    });
});
