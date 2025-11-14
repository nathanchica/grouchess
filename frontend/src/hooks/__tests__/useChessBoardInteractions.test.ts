import { createRef } from 'react';

import type { BoardIndex } from '@grouchess/models';
import { createMockChessBoard, createMockLegalMovesStore, createMockMove } from '@grouchess/test-utils';
import { renderHook } from 'vitest-browser-react';

import { createMockDragProps } from '../../components/chess_board/utils/__mocks__/interactions';
import { useChessBoardInteractions, type UseChessBoardInteractionsParams } from '../useChessBoardInteractions';

// Helper to create default params for the hook
function createDefaultParams(
    overrides: Partial<UseChessBoardInteractionsParams> = {}
): UseChessBoardInteractionsParams {
    return {
        boardRef: createRef<HTMLDivElement>(),
        board: createMockChessBoard(),
        legalMovesStore: createMockLegalMovesStore(),
        ...overrides,
    };
}

describe('useChessBoardInteractions', () => {
    describe('initial state', () => {
        it('returns correct initial values with no selection or drag', async () => {
            const params = createDefaultParams();
            const { result } = await renderHook(() => useChessBoardInteractions(params));

            expect(result.current.dragOverIndex).toBe(null);
            expect(result.current.drag).toBe(null);
            expect(result.current.selectedIndex).toBe(null);
            expect(result.current.selectedPiece).toBe(null);
            expect(result.current.legalMovesForSelectedPieceByEndIndex).toEqual({});
            expect(typeof result.current.clearSelection).toBe('function');
            expect(typeof result.current.clearDragStates).toBe('function');
            expect(typeof result.current.selectIndex).toBe('function');
            expect(typeof result.current.startDrag).toBe('function');
            expect(typeof result.current.updateDragOverIndex).toBe('function');
        });
    });

    describe('selectIndex', () => {
        it('updates selectedIndex and dragOverIndex when selecting a square', async () => {
            const board = createMockChessBoard({ 0: 'N' });
            const params = createDefaultParams({ board });
            const { result } = await renderHook(() => useChessBoardInteractions(params));

            result.current.selectIndex(0);

            await vi.waitFor(() => {
                expect(result.current.selectedIndex).toBe(0);
                expect(result.current.dragOverIndex).toBe(0);
                expect(result.current.selectedPiece).toEqual({
                    color: 'white',
                    type: 'knight',
                    alias: 'N',
                    value: 3,
                });
            });
        });

        it('updates legal moves for selected piece when selecting different squares', async () => {
            const board = createMockChessBoard({ 0: 'N', 8: 'R' });
            const legalMovesStore = createMockLegalMovesStore({
                byStartIndex: {
                    0: [
                        createMockMove({ startIndex: 0 as BoardIndex, endIndex: 10 as BoardIndex }),
                        createMockMove({ startIndex: 0 as BoardIndex, endIndex: 17 as BoardIndex }),
                    ],
                    8: [
                        createMockMove({ startIndex: 8 as BoardIndex, endIndex: 9 as BoardIndex }),
                        createMockMove({ startIndex: 8 as BoardIndex, endIndex: 16 as BoardIndex }),
                    ],
                },
            });
            const params = createDefaultParams({ board, legalMovesStore });
            const { result } = await renderHook(() => useChessBoardInteractions(params));

            // Select knight at index 0
            result.current.selectIndex(0);

            await vi.waitFor(() => {
                expect(result.current.selectedIndex).toBe(0);
                expect(result.current.legalMovesForSelectedPieceByEndIndex[10]).toBeDefined();
                expect(result.current.legalMovesForSelectedPieceByEndIndex[17]).toBeDefined();
            });

            // Select rook at index 8
            result.current.selectIndex(8);

            await vi.waitFor(() => {
                expect(result.current.selectedIndex).toBe(8);
                expect(result.current.legalMovesForSelectedPieceByEndIndex[9]).toBeDefined();
                expect(result.current.legalMovesForSelectedPieceByEndIndex[16]).toBeDefined();
                expect(result.current.legalMovesForSelectedPieceByEndIndex[10]).toBeUndefined();
            });
        });

        it('returns null for selectedPiece when selecting empty square', async () => {
            const board = createMockChessBoard(); // Empty board
            const params = createDefaultParams({ board });
            const { result } = await renderHook(() => useChessBoardInteractions(params));

            result.current.selectIndex(0);

            await vi.waitFor(() => {
                expect(result.current.selectedIndex).toBe(0);
                expect(result.current.selectedPiece).toBe(null);
            });
        });
    });

    describe('startDrag', () => {
        it('sets drag state with provided drag props', async () => {
            const params = createDefaultParams();
            const { result } = await renderHook(() => useChessBoardInteractions(params));

            const dragProps = createMockDragProps({
                pointerId: 5,
                squareSize: 60,
                initialX: 30,
                initialY: 30,
            });

            result.current.startDrag(dragProps);

            await vi.waitFor(() => {
                expect(result.current.drag).toEqual(dragProps);
            });
        });

        it('updates drag state when called multiple times', async () => {
            const params = createDefaultParams();
            const { result } = await renderHook(() => useChessBoardInteractions(params));

            const firstDrag = createMockDragProps({ pointerId: 1 });
            result.current.startDrag(firstDrag);

            await vi.waitFor(() => {
                expect(result.current.drag).toEqual(firstDrag);
            });

            const secondDrag = createMockDragProps({ pointerId: 2 });
            result.current.startDrag(secondDrag);

            await vi.waitFor(() => {
                expect(result.current.drag).toEqual(secondDrag);
            });
        });
    });

    describe('updateDragOverIndex', () => {
        it('updates dragOverIndex to specified value', async () => {
            const params = createDefaultParams();
            const { result } = await renderHook(() => useChessBoardInteractions(params));

            result.current.updateDragOverIndex(16);

            await vi.waitFor(() => {
                expect(result.current.dragOverIndex).toBe(16);
            });
        });

        it('can set dragOverIndex to null', async () => {
            const params = createDefaultParams();
            const { result } = await renderHook(() => useChessBoardInteractions(params));

            // First set it to a value
            result.current.updateDragOverIndex(16);

            await vi.waitFor(() => {
                expect(result.current.dragOverIndex).toBe(16);
            });

            // Then set it to null
            result.current.updateDragOverIndex(null);

            await vi.waitFor(() => {
                expect(result.current.dragOverIndex).toBe(null);
            });
        });

        it('updates dragOverIndex multiple times', async () => {
            const params = createDefaultParams();
            const { result } = await renderHook(() => useChessBoardInteractions(params));

            result.current.updateDragOverIndex(8);

            await vi.waitFor(() => {
                expect(result.current.dragOverIndex).toBe(8);
            });

            result.current.updateDragOverIndex(16);

            await vi.waitFor(() => {
                expect(result.current.dragOverIndex).toBe(16);
            });

            result.current.updateDragOverIndex(24);

            await vi.waitFor(() => {
                expect(result.current.dragOverIndex).toBe(24);
            });
        });
    });

    describe('clearSelection', () => {
        it('clears selectedIndex but preserves drag states', async () => {
            const board = createMockChessBoard({ 0: 'N' });
            const params = createDefaultParams({ board });
            const { result } = await renderHook(() => useChessBoardInteractions(params));

            // Set up selection and drag
            result.current.selectIndex(0);
            result.current.startDrag(createMockDragProps());

            await vi.waitFor(() => {
                expect(result.current.selectedIndex).toBe(0);
                expect(result.current.drag).not.toBe(null);
            });

            // Clear selection
            result.current.clearSelection();

            await vi.waitFor(() => {
                expect(result.current.selectedIndex).toBe(null);
                expect(result.current.selectedPiece).toBe(null);
                // Drag should still be present
                expect(result.current.drag).not.toBe(null);
            });
        });
    });

    describe('clearDragStates', () => {
        it('clears drag and dragOverIndex but preserves selection', async () => {
            const board = createMockChessBoard({ 0: 'N' });
            const params = createDefaultParams({ board });
            const { result } = await renderHook(() => useChessBoardInteractions(params));

            // Set up selection and drag
            result.current.selectIndex(0);
            result.current.startDrag(createMockDragProps());
            result.current.updateDragOverIndex(8);

            await vi.waitFor(() => {
                expect(result.current.selectedIndex).toBe(0);
                expect(result.current.drag).not.toBe(null);
                expect(result.current.dragOverIndex).toBe(8);
            });

            // Clear drag states
            result.current.clearDragStates();

            await vi.waitFor(() => {
                expect(result.current.drag).toBe(null);
                expect(result.current.dragOverIndex).toBe(null);
                // Selection should still be present
                expect(result.current.selectedIndex).toBe(0);
                expect(result.current.selectedPiece).not.toBe(null);
            });
        });
    });

    describe('legal moves validation', () => {
        it('returns empty legal moves when no piece is selected', async () => {
            const params = createDefaultParams();
            const { result } = await renderHook(() => useChessBoardInteractions(params));

            expect(result.current.legalMovesForSelectedPieceByEndIndex).toEqual({});
        });

        it('returns correct legal moves for selected piece', async () => {
            const board = createMockChessBoard({ 0: 'N' });
            const legalMovesStore = createMockLegalMovesStore({
                byStartIndex: {
                    0: [
                        createMockMove({ startIndex: 0 as BoardIndex, endIndex: 10 as BoardIndex }),
                        createMockMove({ startIndex: 0 as BoardIndex, endIndex: 17 as BoardIndex }),
                    ],
                },
            });
            const params = createDefaultParams({ board, legalMovesStore });
            const { result } = await renderHook(() => useChessBoardInteractions(params));

            result.current.selectIndex(0);

            await vi.waitFor(() => {
                expect(result.current.legalMovesForSelectedPieceByEndIndex[10]).toBeDefined();
                expect(result.current.legalMovesForSelectedPieceByEndIndex[17]).toBeDefined();
                expect(Object.keys(result.current.legalMovesForSelectedPieceByEndIndex)).toHaveLength(2);
            });
        });

        it('returns empty legal moves when selected piece has none', async () => {
            const board = createMockChessBoard({ 0: 'P' });
            const legalMovesStore = createMockLegalMovesStore({
                byStartIndex: {
                    0: [], // No legal moves
                },
            });
            const params = createDefaultParams({ board, legalMovesStore });
            const { result } = await renderHook(() => useChessBoardInteractions(params));

            result.current.selectIndex(0);

            await vi.waitFor(() => {
                expect(result.current.selectedPiece).not.toBe(null);
                expect(Object.keys(result.current.legalMovesForSelectedPieceByEndIndex)).toHaveLength(0);
            });
        });
    });

    describe('pointer capture', () => {
        it('captures pointer when drag starts', async () => {
            const boardElement = document.createElement('div') as HTMLDivElement;
            const boardRef = { current: boardElement };

            const setPointerCaptureSpy = vi.spyOn(boardElement, 'setPointerCapture').mockImplementation(() => {});

            const params = createDefaultParams({ boardRef });
            const { result } = await renderHook(() => useChessBoardInteractions(params));

            const dragProps = createMockDragProps({ pointerId: 5 });
            result.current.startDrag(dragProps);

            await vi.waitFor(() => {
                expect(setPointerCaptureSpy).toHaveBeenCalledWith(5);
            });
        });

        it('releases pointer when drag ends', async () => {
            const boardElement = document.createElement('div') as HTMLDivElement;
            const boardRef = { current: boardElement };

            const setPointerCaptureSpy = vi.spyOn(boardElement, 'setPointerCapture').mockImplementation(() => {});
            const releasePointerCaptureSpy = vi
                .spyOn(boardElement, 'releasePointerCapture')
                .mockImplementation(() => {});

            const params = createDefaultParams({ boardRef });
            const { result } = await renderHook(() => useChessBoardInteractions(params));

            const dragProps = createMockDragProps({ pointerId: 7 });
            result.current.startDrag(dragProps);

            await vi.waitFor(() => {
                expect(setPointerCaptureSpy).toHaveBeenCalledWith(7);
            });

            result.current.clearDragStates();

            await vi.waitFor(() => {
                expect(releasePointerCaptureSpy).toHaveBeenCalledWith(7);
            });
        });

        it('handles setPointerCapture errors gracefully', async () => {
            const boardElement = document.createElement('div') as HTMLDivElement;
            const boardRef = { current: boardElement };

            const setPointerCaptureSpy = vi.spyOn(boardElement, 'setPointerCapture').mockImplementation(() => {
                throw new Error('capture error');
            });

            const params = createDefaultParams({ boardRef });
            const { result } = await renderHook(() => useChessBoardInteractions(params));

            const dragProps = createMockDragProps({ pointerId: 9 });

            expect(() => {
                result.current.startDrag(dragProps);
            }).not.toThrow();

            await vi.waitFor(() => {
                expect(setPointerCaptureSpy).toHaveBeenCalledWith(9);
            });
        });

        it('handles releasePointerCapture errors gracefully', async () => {
            const boardElement = document.createElement('div') as HTMLDivElement;
            const boardRef = { current: boardElement };

            const setPointerCaptureSpy = vi.spyOn(boardElement, 'setPointerCapture').mockImplementation(() => {});
            const releasePointerCaptureSpy = vi.spyOn(boardElement, 'releasePointerCapture').mockImplementation(() => {
                throw new Error('release error');
            });

            const params = createDefaultParams({ boardRef });
            const { result } = await renderHook(() => useChessBoardInteractions(params));

            const dragProps = createMockDragProps({ pointerId: 11 });

            result.current.startDrag(dragProps);

            await vi.waitFor(() => {
                expect(setPointerCaptureSpy).toHaveBeenCalledWith(11);
            });

            expect(() => {
                result.current.clearDragStates();
            }).not.toThrow();

            await vi.waitFor(() => {
                expect(releasePointerCaptureSpy).toHaveBeenCalledWith(11);
            });
        });
    });
});
