import type { LegalMovesStore, Move, Piece } from '@grouchess/models';
import { createMockChessGame } from '@grouchess/test-utils';
import { render } from 'vitest-browser-react';

import * as useChessBoardModule from '../../../hooks/useChessBoard';
import * as useChessBoardInteractionsModule from '../../../hooks/useChessBoardInteractions';
import type { DragProps, PendingPromotion } from '../../../utils/types';
import * as windowUtilsModule from '../../../utils/window';
import ChessBoard from '../ChessBoard';
import ChessBoardSquares from '../ChessBoardSquares';
import GhostPiece from '../GhostPiece';
import PawnPromotionPrompt from '../PawnPromotionPrompt';
import * as interactionsModule from '../utils/interactions';

// Mock child components
vi.mock('../ChessBoardSquares', () => ({
    default: vi.fn(() => <div data-testid="chess-board-squares" />),
}));

vi.mock('../GhostPiece', () => ({
    default: vi.fn(() => <div data-testid="ghost-piece" />),
}));

vi.mock('../PawnPromotionPrompt', () => ({
    default: vi.fn(() => <div data-testid="pawn-promotion-prompt" />),
}));

// Mock hooks
vi.mock('../../../hooks/useChessBoard', { spy: true });
vi.mock('../../../hooks/useChessBoardInteractions', { spy: true });

// Mock interaction handler creators
vi.mock('../utils/interactions', { spy: true });

// Mock window utilities
vi.mock('../../../utils/window', { spy: true });

const mockedUseChessBoard = vi.mocked(useChessBoardModule.useChessBoard);
const mockedUseChessBoardInteractions = vi.mocked(useChessBoardInteractionsModule.useChessBoardInteractions);
const mockedCreatePointerDownEventHandler = vi.mocked(interactionsModule.createPointerDownEventHandler);
const mockedAddEventListener = vi.mocked(windowUtilsModule.addEventListener);
const mockedRemoveEventListener = vi.mocked(windowUtilsModule.removeEventListener);
const mockedChessBoardSquares = vi.mocked(ChessBoardSquares);
const mockedGhostPiece = vi.mocked(GhostPiece);
const mockedPawnPromotionPrompt = vi.mocked(PawnPromotionPrompt);

const mockBoard = Array(64).fill(null);
const mockBoardRect = new DOMRect(0, 0, 800, 800);
const mockSelectedPiece: Piece = {
    alias: 'P',
    color: 'white',
    type: 'pawn',
    value: 1,
};
const defaultDragState: DragProps = {
    pointerId: 1,
    squareSize: 100,
    boardRect: mockBoardRect,
    initialX: 40,
    initialY: 60,
};

type UseChessBoardHookReturn = ReturnType<typeof useChessBoardModule.useChessBoard>;
type UseChessBoardInteractionsReturn = ReturnType<typeof useChessBoardInteractionsModule.useChessBoardInteractions>;

function createLegalMovesStore(): LegalMovesStore {
    return {
        allMoves: [],
        byStartIndex: {},
        typeAndEndIndexToStartIndex: {},
    };
}

function createUseChessBoardValues(overrides: Partial<UseChessBoardHookReturn> = {}): UseChessBoardHookReturn {
    return {
        board: mockBoard,
        playerTurn: 'white',
        previousMoveIndices: [],
        legalMovesStore: createLegalMovesStore(),
        boardIsFlipped: false,
        boardInteractionIsDisabled: false,
        pendingPromotion: null,
        checkedColor: undefined,
        movePiece: vi.fn(),
        ...overrides,
    };
}

function createUseChessBoardInteractionsValues(
    overrides: Partial<UseChessBoardInteractionsReturn> = {}
): UseChessBoardInteractionsReturn {
    return {
        drag: null,
        dragOverIndex: null,
        selectedIndex: null,
        selectedPiece: null,
        legalMovesForSelectedPieceByEndIndex: {},
        clearSelection: vi.fn(),
        clearDragStates: vi.fn(),
        selectIndex: vi.fn(),
        startDrag: vi.fn(),
        updateDragOverIndex: vi.fn(),
        ...overrides,
    };
}

function createPendingPromotion(overrides: Partial<PendingPromotion> = {}): PendingPromotion {
    const defaultMove: Move = {
        startIndex: 8,
        endIndex: 0,
        type: 'standard',
        piece: mockSelectedPiece,
    };

    return {
        move: {
            ...defaultMove,
            ...(overrides.move ?? {}),
        },
        preChessGame: overrides.preChessGame ?? createMockChessGame(),
        prePreviousMoveIndices: overrides.prePreviousMoveIndices ?? [],
    };
}

function mockBoardBoundingClientRect(rect: DOMRect = mockBoardRect) {
    const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');
    spy.mockReturnValue(rect);
    return spy;
}

function renderChessBoard() {
    return render(<ChessBoard />);
}

describe('ChessBoard', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock for useChessBoard
        const defaultUseChessBoardValues = createUseChessBoardValues();
        vi.spyOn(useChessBoardModule, 'useChessBoard').mockReturnValue(defaultUseChessBoardValues);

        // Default mock for useChessBoardInteractions
        const defaultInteractionsValues = createUseChessBoardInteractionsValues();
        vi.spyOn(useChessBoardInteractionsModule, 'useChessBoardInteractions').mockReturnValue(
            defaultInteractionsValues
        );

        // Default mocks for handler creators
        vi.spyOn(interactionsModule, 'createPointerDownEventHandler').mockReturnValue(vi.fn());
        vi.spyOn(interactionsModule, 'createPointerMoveEventHandler').mockReturnValue(vi.fn());
        vi.spyOn(interactionsModule, 'createPointerUpEventHandler').mockReturnValue(vi.fn());

        // Default mocks for window utilities
        vi.spyOn(windowUtilsModule, 'addEventListener').mockImplementation(vi.fn());
        vi.spyOn(windowUtilsModule, 'removeEventListener').mockImplementation(vi.fn());
    });

    describe('Initial Render and Component Structure', () => {
        it('renders GameBoard with ChessBoardSquares', async () => {
            const { getByRole, getByTestId } = await renderChessBoard();

            const grid = getByRole('grid');
            await expect.element(grid).toBeInTheDocument();

            const squares = getByTestId('chess-board-squares');
            await expect.element(squares).toBeInTheDocument();

            expect(mockedChessBoardSquares).toHaveBeenCalled();
        });

        it('does not render GhostPiece initially', async () => {
            const { getByTestId } = await renderChessBoard();

            const ghostPiece = getByTestId('ghost-piece');
            await expect.element(ghostPiece).not.toBeInTheDocument();
            expect(mockedGhostPiece).not.toHaveBeenCalled();
        });

        it('does not render PawnPromotionPrompt initially', async () => {
            const { getByTestId } = await renderChessBoard();

            const pawnPromotionPrompt = getByTestId('pawn-promotion-prompt');
            await expect.element(pawnPromotionPrompt).not.toBeInTheDocument();
            expect(mockedPawnPromotionPrompt).not.toHaveBeenCalled();
        });
    });

    describe('Window Event Handling', () => {
        it('adds resize and scroll listeners on mount', async () => {
            await renderChessBoard();

            expect(mockedAddEventListener).toHaveBeenCalledTimes(2);
            expect(mockedAddEventListener).toHaveBeenNthCalledWith(1, 'resize', expect.any(Function));
            expect(mockedAddEventListener).toHaveBeenNthCalledWith(2, 'scroll', expect.any(Function), {
                passive: true,
            });
        });

        it('updates boardRect when window resizes', async () => {
            const boundingSpy = mockBoardBoundingClientRect();
            await renderChessBoard();

            const resizeHandler = mockedAddEventListener.mock.calls[0]?.[1] as (() => void) | undefined;
            expect(resizeHandler).toBeTypeOf('function');

            const resizedRect = new DOMRect(0, 0, 600, 600);
            boundingSpy.mockReturnValue(resizedRect);

            resizeHandler?.();

            const lastCall = mockedCreatePointerDownEventHandler.mock.calls.at(-1);
            expect(lastCall?.[0]).toEqual(resizedRect);

            boundingSpy.mockRestore();
        });

        it('updates boardRect when window scrolls', async () => {
            const boundingSpy = mockBoardBoundingClientRect();
            await renderChessBoard();

            const scrollHandler = mockedAddEventListener.mock.calls[1]?.[1] as (() => void) | undefined;
            expect(scrollHandler).toBeTypeOf('function');

            const scrolledRect = new DOMRect(0, 0, 500, 500);
            boundingSpy.mockReturnValue(scrolledRect);

            scrollHandler?.();

            const lastCall = mockedCreatePointerDownEventHandler.mock.calls.at(-1);
            expect(lastCall?.[0]).toEqual(scrolledRect);

            boundingSpy.mockRestore();
        });

        it('removes resize and scroll listeners on unmount', async () => {
            const { unmount } = await renderChessBoard();
            const resizeHandler = mockedAddEventListener.mock.calls[0]?.[1];
            const scrollHandler = mockedAddEventListener.mock.calls[1]?.[1];
            const scrollOptions = mockedAddEventListener.mock.calls[1]?.[2];

            unmount();

            expect(mockedRemoveEventListener).toHaveBeenCalledTimes(2);
            expect(mockedRemoveEventListener).toHaveBeenNthCalledWith(1, 'resize', resizeHandler);
            expect(mockedRemoveEventListener).toHaveBeenNthCalledWith(2, 'scroll', scrollHandler, scrollOptions);
        });
    });

    describe('Conditional Rendering - GhostPiece', () => {
        it('renders GhostPiece when drag is active and piece is selected', async () => {
            const drag: DragProps = { ...defaultDragState };
            const selectedPiece: Piece = { ...mockSelectedPiece };
            mockedUseChessBoardInteractions.mockReturnValue(
                createUseChessBoardInteractionsValues({
                    drag,
                    selectedPiece,
                    selectedIndex: 12,
                })
            );

            const { getByTestId } = await renderChessBoard();

            const ghostPiece = getByTestId('ghost-piece');
            await expect.element(ghostPiece).toBeInTheDocument();

            const ghostProps = mockedGhostPiece.mock.calls.at(-1)?.[0];
            expect(ghostProps).toBeDefined();
            expect(ghostProps).toMatchObject({
                squareSize: drag.squareSize,
                initialX: drag.initialX,
                initialY: drag.initialY,
                pieceAlias: selectedPiece.alias,
            });
        });

        it('does not render GhostPiece when drag is null', async () => {
            mockedUseChessBoardInteractions.mockReturnValue(
                createUseChessBoardInteractionsValues({
                    drag: null,
                    selectedPiece: { ...mockSelectedPiece },
                })
            );

            const { getByTestId } = await renderChessBoard();

            const ghostPiece = getByTestId('ghost-piece');
            await expect.element(ghostPiece).not.toBeInTheDocument();
            expect(mockedGhostPiece).not.toHaveBeenCalled();
        });

        it('does not render GhostPiece when selectedPiece is null', async () => {
            mockedUseChessBoardInteractions.mockReturnValue(
                createUseChessBoardInteractionsValues({
                    drag: { ...defaultDragState },
                    selectedPiece: null,
                })
            );

            const { getByTestId } = await renderChessBoard();

            const ghostPiece = getByTestId('ghost-piece');
            await expect.element(ghostPiece).not.toBeInTheDocument();
            expect(mockedGhostPiece).not.toHaveBeenCalled();
        });

        it('does not render GhostPiece during pending promotion', async () => {
            mockedUseChessBoard.mockReturnValue(
                createUseChessBoardValues({
                    pendingPromotion: createPendingPromotion(),
                })
            );
            mockedUseChessBoardInteractions.mockReturnValue(
                createUseChessBoardInteractionsValues({
                    drag: { ...defaultDragState },
                    selectedPiece: { ...mockSelectedPiece },
                })
            );

            const { getByTestId } = await renderChessBoard();

            const ghostPiece = getByTestId('ghost-piece');
            await expect.element(ghostPiece).not.toBeInTheDocument();
            expect(mockedGhostPiece).not.toHaveBeenCalled();
        });
    });

    describe('Conditional Rendering - PawnPromotionPrompt', () => {
        it('renders PawnPromotionPrompt when pendingPromotion exists', async () => {
            const pendingPromotion = createPendingPromotion({
                move: {
                    startIndex: 10,
                    endIndex: 63,
                    type: 'standard',
                    piece: { ...mockSelectedPiece, color: 'black' },
                },
            });
            const clearSelection = vi.fn();
            mockedUseChessBoard.mockReturnValue(
                createUseChessBoardValues({
                    pendingPromotion,
                    boardIsFlipped: true,
                })
            );
            mockedUseChessBoardInteractions.mockReturnValue(
                createUseChessBoardInteractionsValues({
                    clearSelection,
                })
            );
            const boundingSpy = mockBoardBoundingClientRect();

            const { getByTestId } = await renderChessBoard();

            const prompt = getByTestId('pawn-promotion-prompt');
            await expect.element(prompt).toBeInTheDocument();

            const promptProps = mockedPawnPromotionPrompt.mock.calls.at(-1)?.[0];
            expect(promptProps).toBeDefined();
            expect(promptProps).toMatchObject({
                squareSize: 100,
                promotionIndex: pendingPromotion.move.endIndex,
                color: pendingPromotion.move.piece.color,
                isFlipped: true,
            });
            expect(promptProps?.onDismiss).toBe(clearSelection);

            boundingSpy.mockRestore();
        });

        it('does not render PawnPromotionPrompt when pendingPromotion is null', async () => {
            const { getByTestId } = await renderChessBoard();

            const prompt = getByTestId('pawn-promotion-prompt');
            await expect.element(prompt).not.toBeInTheDocument();
            expect(mockedPawnPromotionPrompt).not.toHaveBeenCalled();
        });
    });
});
