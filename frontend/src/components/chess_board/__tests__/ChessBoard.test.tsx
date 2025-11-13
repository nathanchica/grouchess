import { type PointerEvent } from 'react';

import { createMockMove, createMockPiece, createMockLegalMovesStore } from '@grouchess/test-utils';
import { render } from 'vitest-browser-react';

import {
    ChessGameContext,
    GameRoomContext,
    type ChessGameContextType,
    type GameRoomContextType,
} from '../../../providers/ChessGameRoomProvider';
import { ImageContext, type ImageContextType } from '../../../providers/ImagesProvider';
import {
    createMockChessGameContextValues,
    createMockGameRoomContextValues,
} from '../../../providers/__mocks__/ChessGameRoomProvider';
import { createMockImageContextValues } from '../../../providers/__mocks__/ImagesProvider';
import ChessBoard, { processContextValues, type ProcessContextValuesParams } from '../ChessBoard';
import {
    createMockUseChessBoardInteractionsPayload,
    createMockUseChessBoardInteractionsPayloadWithSelectedPiece,
} from '../utils/__mocks__/useChessBoardInteractions';
import * as useChessBoardInteractionsModule from '../utils/useChessBoardInteractions';

vi.mock('../utils/useChessBoardInteractions', { spy: true });

type RenderChessBoardOptions = {
    chessGameContextValues?: ChessGameContextType;
    gameRoomContextValues?: GameRoomContextType;
    imageContextValues?: ImageContextType;
};

function renderChessBoard({
    chessGameContextValues = createMockChessGameContextValues(),
    gameRoomContextValues = createMockGameRoomContextValues(),
    imageContextValues = createMockImageContextValues(),
}: RenderChessBoardOptions = {}) {
    return render(
        <ImageContext.Provider value={imageContextValues}>
            <ChessGameContext.Provider value={chessGameContextValues}>
                <GameRoomContext.Provider value={gameRoomContextValues}>
                    <ChessBoard />
                </GameRoomContext.Provider>
            </ChessGameContext.Provider>
        </ImageContext.Provider>
    );
}

describe('ChessBoard', () => {
    let mockChessGameContextValues: ChessGameContextType;
    let mockGameRoomContextValues: GameRoomContextType;
    let mockImageContextValues: ImageContextType;
    let mockUseChessBoardInteractionsPayload: useChessBoardInteractionsModule.UseChessBoardInteractionsPayload;

    beforeEach(() => {
        mockChessGameContextValues = createMockChessGameContextValues();
        mockGameRoomContextValues = createMockGameRoomContextValues();
        mockImageContextValues = createMockImageContextValues();
        mockUseChessBoardInteractionsPayload = createMockUseChessBoardInteractionsPayload();
        vi.spyOn(useChessBoardInteractionsModule, 'useChessBoardInteractions').mockReturnValue(
            mockUseChessBoardInteractionsPayload
        );
    });

    describe('Initial Rendering and Image Loading', () => {
        it('renders 64 chess squares on initial mount', async () => {
            const { getByRole } = await renderChessBoard({
                chessGameContextValues: mockChessGameContextValues,
                gameRoomContextValues: mockGameRoomContextValues,
                imageContextValues: mockImageContextValues,
            });

            const grid = getByRole('grid');
            const squares = grid.getByRole('gridcell').elements();

            expect(squares.length).toBe(64);
        });

        it('hides pieces when images are not ready', async () => {
            // prettier-ignore
            mockChessGameContextValues.chessGame.boardState.board = [
                'r', 'n', 'b', 'q', 'k', 'b', 'n', 'r',
                'p', 'p', 'p', 'p', 'p', 'p', 'p', 'p',
                null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null,
                'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P',
                'R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R',
            ];
            mockImageContextValues.isReady = false;

            const { getByRole } = await renderChessBoard({
                chessGameContextValues: mockChessGameContextValues,
                gameRoomContextValues: mockGameRoomContextValues,
                imageContextValues: mockImageContextValues,
            });

            const grid = getByRole('grid');
            const images = grid.getByRole('img').elements();

            expect(images.length).toBe(0);
        });

        it('shows pieces after images are loaded', async () => {
            // prettier-ignore
            mockChessGameContextValues.chessGame.boardState.board = [
                'r', 'n', 'b', 'q', 'k', 'b', 'n', 'r',
                'p', 'p', 'p', 'p', 'p', 'p', 'p', 'p',
                null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null,
                'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P',
                'R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R',
            ];
            mockImageContextValues.isReady = true;

            const { getByRole } = await renderChessBoard({
                chessGameContextValues: mockChessGameContextValues,
                gameRoomContextValues: mockGameRoomContextValues,
                imageContextValues: mockImageContextValues,
            });

            const grid = getByRole('grid');
            const images = grid.getByRole('img').elements();

            // 32 pieces should be rendered when images are ready (16 white + 16 black)
            expect(images.length).toBe(32);
        });

        it('renders empty squares correctly', async () => {
            mockChessGameContextValues.chessGame.boardState.board = Array(64).fill(null);
            mockImageContextValues.isReady = true;

            const { getByRole } = await renderChessBoard({
                chessGameContextValues: mockChessGameContextValues,
                gameRoomContextValues: mockGameRoomContextValues,
                imageContextValues: mockImageContextValues,
            });

            const grid = getByRole('grid');
            const squares = grid.getByRole('gridcell').elements();
            const images = grid.getByRole('img').elements();

            expect(squares.length).toBe(64);
            expect(images.length).toBe(0);
        });
    });

    describe('Board Flipping and Perspective', () => {
        it('passes correct isFlipped prop to ChessSquare components', async () => {
            mockGameRoomContextValues.currentPlayerColor = 'white';

            const { getByRole, rerender } = await renderChessBoard({
                chessGameContextValues: mockChessGameContextValues,
                gameRoomContextValues: mockGameRoomContextValues,
                imageContextValues: mockImageContextValues,
            });

            // When not flipped: bottom-left visual corner shows a1 legends
            const a1Square = getByRole('gridcell', { name: /a1/i });
            const a1ColLegend = a1Square.getByTestId('col-legend');
            const a1RowLegend = a1Square.getByTestId('row-legend');

            await expect.element(a1ColLegend).toHaveTextContent('a');
            await expect.element(a1RowLegend).toHaveTextContent('1');

            // Now test with black perspective (flipped)
            mockGameRoomContextValues.currentPlayerColor = 'black';

            await rerender(
                <ImageContext.Provider value={mockImageContextValues}>
                    <ChessGameContext.Provider value={mockChessGameContextValues}>
                        <GameRoomContext.Provider value={mockGameRoomContextValues}>
                            <ChessBoard />
                        </GameRoomContext.Provider>
                    </ChessGameContext.Provider>
                </ImageContext.Provider>
            );

            // When flipped: bottom-left visual corner should now show h8 legend
            const h8Square = getByRole('gridcell', { name: /h8/i });
            const h8ColLegend = h8Square.getByTestId('col-legend');
            const h8RowLegend = h8Square.getByTestId('row-legend');

            await expect.element(h8ColLegend).toHaveTextContent('h');
            await expect.element(h8RowLegend).toHaveTextContent('8');
        });

        it('passes correct isFlipped prop to PawnPromotionPrompt', async () => {
            mockImageContextValues.isReady = true;
            mockGameRoomContextValues.currentPlayerColor = 'white';
            const whitePromotionMove = createMockMove();
            whitePromotionMove.startIndex = 8;
            whitePromotionMove.endIndex = 0;
            whitePromotionMove.piece = createMockPiece({ alias: 'P', color: 'white', type: 'pawn', value: 1 });
            mockChessGameContextValues.chessGame.pendingPromotion = {
                move: whitePromotionMove,
                preChessGame: mockChessGameContextValues.chessGame,
                prePreviousMoveIndices: [],
            };

            const { getByRole, rerender } = await renderChessBoard({
                chessGameContextValues: mockChessGameContextValues,
                gameRoomContextValues: mockGameRoomContextValues,
                imageContextValues: mockImageContextValues,
            });

            let dialog = getByRole('dialog', { name: /pawn promotion options/i });
            await expect.element(dialog).toBeVisible();

            let options = dialog.getByRole('button').elements();
            expect(options.length).toBe(4);
            expect(options[0]).toHaveAccessibleName(/promote to white queen/i);

            // Now test with black perspective (flipped)
            mockGameRoomContextValues.currentPlayerColor = 'black';
            const blackPromotionMove = createMockMove();
            blackPromotionMove.startIndex = 55;
            blackPromotionMove.endIndex = 63;
            blackPromotionMove.piece = createMockPiece({ alias: 'p', color: 'black', type: 'pawn', value: 1 });
            mockChessGameContextValues.chessGame.pendingPromotion = {
                move: blackPromotionMove,
                preChessGame: mockChessGameContextValues.chessGame,
                prePreviousMoveIndices: [],
            };

            await rerender(
                <ImageContext.Provider value={mockImageContextValues}>
                    <ChessGameContext.Provider value={mockChessGameContextValues}>
                        <GameRoomContext.Provider value={mockGameRoomContextValues}>
                            <ChessBoard />
                        </GameRoomContext.Provider>
                    </ChessGameContext.Provider>
                </ImageContext.Provider>
            );

            dialog = getByRole('dialog', { name: /pawn promotion options/i });
            options = dialog.getByRole('button').elements();

            // When flipped, the queen should still be on top visually
            await expect.element(dialog).toBeVisible();
            expect(options.length).toBe(4);
            expect(options[0]).toHaveAccessibleName(/promote to black queen/i);
        });
    });

    describe('Pointer Event Delegation', () => {
        describe('Pointer event handlers', () => {
            it.each<{
                scenario: string;
                eventType: 'pointerdown' | 'pointermove' | 'pointerup';
                handlerKey: 'handlePointerDown' | 'handlePointerMove' | 'handlePointerUp';
            }>([
                {
                    scenario: 'passes pointer down events to interaction hook handler',
                    eventType: 'pointerdown',
                    handlerKey: 'handlePointerDown',
                },
                {
                    scenario: 'passes pointer move events to interaction hook handler',
                    eventType: 'pointermove',
                    handlerKey: 'handlePointerMove',
                },
                {
                    scenario: 'passes pointer up events to interaction hook handler',
                    eventType: 'pointerup',
                    handlerKey: 'handlePointerUp',
                },
            ])('$scenario', async ({ eventType, handlerKey }) => {
                const mockHandler: (event: PointerEvent<HTMLDivElement>) => void = vi.fn();
                mockUseChessBoardInteractionsPayload[handlerKey] = mockHandler;
                vi.spyOn(useChessBoardInteractionsModule, 'useChessBoardInteractions').mockReturnValue(
                    mockUseChessBoardInteractionsPayload
                );

                const { getByRole } = await renderChessBoard({
                    chessGameContextValues: mockChessGameContextValues,
                    gameRoomContextValues: mockGameRoomContextValues,
                    imageContextValues: mockImageContextValues,
                });

                const grid = getByRole('grid');
                grid.element().dispatchEvent(new PointerEvent(eventType, { bubbles: true }));

                expect(mockHandler).toHaveBeenCalledOnce();
            });
        });

        it('passes pointer cancel events to clearDragStates', async () => {
            const mockClearDragStates: () => void = vi.fn();
            mockUseChessBoardInteractionsPayload.clearDragStates = mockClearDragStates;
            vi.spyOn(useChessBoardInteractionsModule, 'useChessBoardInteractions').mockReturnValue(
                mockUseChessBoardInteractionsPayload
            );

            const { getByRole } = await renderChessBoard({
                chessGameContextValues: mockChessGameContextValues,
                gameRoomContextValues: mockGameRoomContextValues,
                imageContextValues: mockImageContextValues,
            });

            const grid = getByRole('grid');
            grid.element().dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }));

            expect(mockClearDragStates).toHaveBeenCalledOnce();
        });
    });

    describe('Drag State and Ghost Piece', () => {
        it('shows ghost piece during active drag', async () => {
            mockImageContextValues.isReady = true;
            const whitePiece = createMockPiece({ alias: 'N', color: 'white' });
            mockUseChessBoardInteractionsPayload = createMockUseChessBoardInteractionsPayloadWithSelectedPiece({
                selectedIndex: 1,
                selectedPiece: whitePiece,
            });
            vi.spyOn(useChessBoardInteractionsModule, 'useChessBoardInteractions').mockReturnValue(
                mockUseChessBoardInteractionsPayload
            );

            const { getByRole } = await renderChessBoard({
                chessGameContextValues: mockChessGameContextValues,
                gameRoomContextValues: mockGameRoomContextValues,
                imageContextValues: mockImageContextValues,
            });

            const ghostPiece = getByRole('img', { name: /dragging piece/i });
            await expect.element(ghostPiece).toBeInTheDocument();
        });

        it('hides ghost piece when no drag is active', async () => {
            mockImageContextValues.isReady = true;
            mockUseChessBoardInteractionsPayload.drag = null;
            mockUseChessBoardInteractionsPayload.selectedIndex = null;
            mockUseChessBoardInteractionsPayload.selectedPiece = null;
            vi.spyOn(useChessBoardInteractionsModule, 'useChessBoardInteractions').mockReturnValue(
                mockUseChessBoardInteractionsPayload
            );

            const { getByRole } = await renderChessBoard({
                chessGameContextValues: mockChessGameContextValues,
                gameRoomContextValues: mockGameRoomContextValues,
                imageContextValues: mockImageContextValues,
            });

            const ghostPiece = getByRole('img', { name: /dragging piece/i });
            await expect.element(ghostPiece).not.toBeInTheDocument();
        });

        it('hides ghost piece during pawn promotion', async () => {
            mockImageContextValues.isReady = true;
            const whitePiece = createMockPiece({ alias: 'P', color: 'white', type: 'pawn' });
            const promotionMove = createMockMove();
            promotionMove.startIndex = 8;
            promotionMove.endIndex = 0;
            promotionMove.piece = whitePiece;

            mockChessGameContextValues.chessGame.pendingPromotion = {
                move: promotionMove,
                preChessGame: mockChessGameContextValues.chessGame,
                prePreviousMoveIndices: [],
            };

            mockUseChessBoardInteractionsPayload = createMockUseChessBoardInteractionsPayloadWithSelectedPiece({
                selectedIndex: 0,
                selectedPiece: whitePiece,
            });
            vi.spyOn(useChessBoardInteractionsModule, 'useChessBoardInteractions').mockReturnValue(
                mockUseChessBoardInteractionsPayload
            );

            const { getByRole } = await renderChessBoard({
                chessGameContextValues: mockChessGameContextValues,
                gameRoomContextValues: mockGameRoomContextValues,
                imageContextValues: mockImageContextValues,
            });

            // Pawn promotion dialog should be visible
            const dialog = getByRole('dialog', { name: /pawn promotion options/i });
            await expect.element(dialog).toBeInTheDocument();

            // Ghost piece should not be rendered
            const ghostPiece = getByRole('img', { name: /dragging piece/i });
            await expect.element(ghostPiece).not.toBeInTheDocument();
        });

        it('hides dragged piece from original square during drag', async () => {
            // prettier-ignore
            mockChessGameContextValues.chessGame.boardState.board = [
                'r', 'n', 'b', 'q', 'k', 'b', 'n', 'r',
                'p', 'p', 'p', 'p', 'p', 'p', 'p', 'p',
                null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null,
                'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P',
                'R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R',
            ];
            mockImageContextValues.isReady = true;

            const selectedSquareIndex = 57; // White knight on b1
            const whitePiece = createMockPiece({ alias: 'N', color: 'white' });
            mockUseChessBoardInteractionsPayload = createMockUseChessBoardInteractionsPayloadWithSelectedPiece({
                selectedIndex: selectedSquareIndex,
                selectedPiece: whitePiece,
            });
            vi.spyOn(useChessBoardInteractionsModule, 'useChessBoardInteractions').mockReturnValue(
                mockUseChessBoardInteractionsPayload
            );

            const { getByRole } = await renderChessBoard({
                chessGameContextValues: mockChessGameContextValues,
                gameRoomContextValues: mockGameRoomContextValues,
                imageContextValues: mockImageContextValues,
            });

            // Ghost piece should be visible (dragging)
            const ghostPiece = getByRole('img', { name: /dragging piece/i });
            await expect.element(ghostPiece).toBeInTheDocument();

            // Get all images and separate them
            const allImages = getByRole('img').elements();
            const ghostPieceImages = allImages.filter((img) => img.getAttribute('alt')?.match(/dragging piece/i));
            const piecesOnBoard = allImages.filter((img) => !img.getAttribute('alt')?.match(/dragging piece/i));

            // Should have exactly 1 ghost piece and 31 pieces on the board (32 total - 1 being dragged)
            expect(ghostPieceImages.length).toBe(1);
            expect(piecesOnBoard.length).toBe(31);
        });

        it('ghost piece ref is forwarded correctly', async () => {
            mockImageContextValues.isReady = true;
            const whitePiece = createMockPiece({ alias: 'K', color: 'white' });

            mockUseChessBoardInteractionsPayload = createMockUseChessBoardInteractionsPayloadWithSelectedPiece({
                selectedIndex: 4,
                selectedPiece: whitePiece,
            });
            vi.spyOn(useChessBoardInteractionsModule, 'useChessBoardInteractions').mockReturnValue(
                mockUseChessBoardInteractionsPayload
            );

            const { getByRole } = await renderChessBoard({
                chessGameContextValues: mockChessGameContextValues,
                gameRoomContextValues: mockGameRoomContextValues,
                imageContextValues: mockImageContextValues,
            });

            // Verify the ghost piece is rendered
            const ghostPieceImage = getByRole('img', { name: /dragging piece.*king/i });
            await expect.element(ghostPieceImage).toBeInTheDocument();

            // The ghost piece's parent div should be the ref-forwarded element
            const ghostPiece = ghostPieceImage.element().parentElement;
            expect(ghostPiece).not.toBeNull();
            expect(ghostPiece).toBeInstanceOf(HTMLDivElement);
        });
    });
});

describe('processContextValues', () => {
    describe('boardIsFlipped', () => {
        it.each([
            {
                scenario: 'returns true when current player is black',
                currentPlayerColor: 'black' as const,
                expected: true,
            },
            {
                scenario: 'returns false when current player is white',
                currentPlayerColor: 'white' as const,
                expected: false,
            },
        ])('$scenario', ({ currentPlayerColor, expected }) => {
            const { chessGame } = createMockChessGameContextValues();
            const { gameRoom } = createMockGameRoomContextValues();

            const params: ProcessContextValuesParams = {
                chessGame,
                gameRoom,
                currentPlayerColor,
            };

            const { boardIsFlipped } = processContextValues(params);

            expect(boardIsFlipped).toBe(expected);
        });
    });

    describe('isCurrentPlayerTurn (affects boardInteractionIsDisabled)', () => {
        it('enables interaction in self-play mode regardless of player turn', () => {
            const { chessGame } = createMockChessGameContextValues();
            chessGame.boardState.playerTurn = 'white';

            const { gameRoom } = createMockGameRoomContextValues();
            gameRoom.type = 'self';

            const { boardInteractionIsDisabled } = processContextValues({
                chessGame,
                gameRoom,
                currentPlayerColor: 'black', // Different from playerTurn
            });

            expect(boardInteractionIsDisabled).toBe(false);
        });

        it.each([
            {
                scenario: 'enables interaction when current player color matches player turn in multiplayer',
                currentPlayerColor: 'white' as const,
                playerTurn: 'white' as const,
                expectedDisabled: false,
            },
            {
                scenario: 'disables interaction when current player color does not match player turn in multiplayer',
                currentPlayerColor: 'black' as const,
                playerTurn: 'white' as const,
                expectedDisabled: true,
            },
        ])('$scenario', ({ currentPlayerColor, playerTurn, expectedDisabled }) => {
            const { chessGame } = createMockChessGameContextValues();
            chessGame.boardState.playerTurn = playerTurn;

            const { gameRoom } = createMockGameRoomContextValues();
            gameRoom.type = 'player-vs-player';

            const { boardInteractionIsDisabled } = processContextValues({
                chessGame,
                gameRoom,
                currentPlayerColor,
            });

            expect(boardInteractionIsDisabled).toBe(expectedDisabled);
        });
    });

    describe('boardInteractionIsDisabled', () => {
        it('disables interaction when there is a pending promotion', () => {
            const { chessGame } = createMockChessGameContextValues();
            const promotionMove = createMockMove();
            promotionMove.startIndex = 8;
            promotionMove.endIndex = 0;
            promotionMove.piece = createMockPiece({ type: 'pawn', color: 'white', alias: 'P' });

            chessGame.pendingPromotion = {
                move: promotionMove,
                preChessGame: chessGame,
                prePreviousMoveIndices: [],
            };

            const { gameRoom } = createMockGameRoomContextValues();
            gameRoom.type = 'self';

            const { boardInteractionIsDisabled } = processContextValues({
                chessGame,
                gameRoom,
                currentPlayerColor: 'white',
            });

            expect(boardInteractionIsDisabled).toBe(true);
        });

        it.each([
            { scenario: 'checkmate', status: 'checkmate' as const, winner: 'black' as const },
            { scenario: 'stalemate', status: 'stalemate' as const, winner: undefined },
            { scenario: '50-move draw', status: '50-move-draw' as const, winner: undefined },
            { scenario: 'threefold repetition', status: 'threefold-repetition' as const, winner: undefined },
        ])('disables interaction when game is over ($scenario)', ({ status, winner }) => {
            const { chessGame } = createMockChessGameContextValues();
            chessGame.gameState.status = status;
            chessGame.gameState.winner = winner ?? undefined;

            const { gameRoom } = createMockGameRoomContextValues();
            gameRoom.type = 'self';

            const { boardInteractionIsDisabled } = processContextValues({
                chessGame,
                gameRoom,
                currentPlayerColor: 'white',
            });

            expect(boardInteractionIsDisabled).toBe(true);
        });

        it('enables interaction when game is in progress, no pending promotion, and is current player turn', () => {
            const { chessGame } = createMockChessGameContextValues();
            chessGame.gameState.status = 'in-progress';
            chessGame.pendingPromotion = null;

            const { gameRoom } = createMockGameRoomContextValues();
            gameRoom.type = 'self';

            const { boardInteractionIsDisabled } = processContextValues({
                chessGame,
                gameRoom,
                currentPlayerColor: 'white',
            });

            expect(boardInteractionIsDisabled).toBe(false);
        });
    });

    describe('returned values', () => {
        it('returns all expected values from input contexts', () => {
            const { chessGame } = createMockChessGameContextValues();

            const mockBoard = Array(64).fill(null);
            chessGame.boardState.board = mockBoard;
            chessGame.boardState.playerTurn = 'black';

            const mockPreviousMoveIndices = [12, 28];
            chessGame.previousMoveIndices = mockPreviousMoveIndices;

            const mockLegalMovesStore = createMockLegalMovesStore();
            chessGame.legalMovesStore = mockLegalMovesStore;
            chessGame.pendingPromotion = null;
            chessGame.gameState.check = 'white';

            const { gameRoom } = createMockGameRoomContextValues();
            gameRoom.type = 'player-vs-player';

            const {
                board,
                playerTurn,
                previousMoveIndices,
                legalMovesStore,
                boardIsFlipped,
                boardInteractionIsDisabled,
                pendingPromotion,
                checkedColor,
            } = processContextValues({
                chessGame,
                gameRoom,
                currentPlayerColor: 'black',
            });

            expect(board).toBe(mockBoard);
            expect(playerTurn).toBe('black');
            expect(previousMoveIndices).toBe(mockPreviousMoveIndices);
            expect(legalMovesStore).toBe(mockLegalMovesStore);
            expect(boardIsFlipped).toBe(true);
            expect(boardInteractionIsDisabled).toBe(false);
            expect(pendingPromotion).toBe(null);
            expect(checkedColor).toBe('white');
        });

        it('correctly extracts all boardState properties', () => {
            const { chessGame } = createMockChessGameContextValues();

            const mockBoard = Array(64).fill('P');
            chessGame.boardState.board = mockBoard;
            chessGame.boardState.playerTurn = 'white';

            const { gameRoom } = createMockGameRoomContextValues();

            const { board, playerTurn } = processContextValues({
                chessGame,
                gameRoom,
                currentPlayerColor: 'white',
            });

            expect(board).toBe(mockBoard);
            expect(playerTurn).toBe('white');
        });

        it('correctly extracts gameState properties', () => {
            const { chessGame } = createMockChessGameContextValues();
            chessGame.gameState.check = 'black';

            const { gameRoom } = createMockGameRoomContextValues();

            const { checkedColor } = processContextValues({
                chessGame,
                gameRoom,
                currentPlayerColor: 'white',
            });

            expect(checkedColor).toBe('black');
        });
    });
});
