import type { PawnPromotion } from '@grouchess/models';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { ChessGameContext, type ChessGameContextType } from '../../../providers/ChessGameRoomProvider';
import { createMockChessGameContextValues } from '../../../providers/__mocks__/ChessGameRoomProvider';
import PawnPromotionPrompt, {
    getPawnPromotionOptions,
    getPromptPositionAndSize,
    type PawnPromotionPromptProps,
} from '../PawnPromotionPrompt';
import type { PromotionCardProps } from '../PromotionCard';

vi.mock('../PromotionCard', () => {
    return {
        default: function MockPromotionCard(props: PromotionCardProps) {
            return (
                <div data-testid="promotion-card" className="absolute z-30" onClick={(e) => e.stopPropagation()}>
                    <p>Mock PromotionCard</p>
                    <p>options: {JSON.stringify(props.options)}</p>
                    <p>squareSize: {props.squareSize}</p>
                    <p>style: {JSON.stringify(props.style)}</p>
                    <p>onSelect: {typeof props.onSelect}</p>
                    {props.options.map((option: PawnPromotion) => (
                        <button key={option} data-testid={`select-${option}`} onClick={() => props.onSelect(option)}>
                            Select {option}
                        </button>
                    ))}
                </div>
            );
        },
    };
});

type RenderPawnPromotionPromptOptions = {
    propOverrides?: Partial<PawnPromotionPromptProps>;
    chessGameContextValues?: ChessGameContextType;
};

const defaultBoardRect: DOMRect = {
    width: 800,
    height: 800,
    top: 0,
    left: 0,
    right: 800,
    bottom: 800,
    x: 0,
    y: 0,
    toJSON: () => {},
};

function renderPawnPromotionPrompt({
    propOverrides = {},
    chessGameContextValues = createMockChessGameContextValues(),
}: RenderPawnPromotionPromptOptions = {}) {
    const defaultProps: PawnPromotionPromptProps = {
        boardRect: defaultBoardRect,
        promotionIndex: 0,
        color: 'white' as const,
        onDismiss: vi.fn(),
        isFlipped: false,
    };

    const props = { ...defaultProps, ...propOverrides };

    return render(
        <ChessGameContext.Provider value={chessGameContextValues}>
            <PawnPromotionPrompt {...props} />
        </ChessGameContext.Provider>
    );
}

describe('PawnPromotionPrompt', () => {
    describe('getPawnPromotionOptions', () => {
        it.each([
            {
                scenario: 'white pieces, normal orientation',
                color: 'white' as const,
                isFlipped: false,
                expected: ['Q', 'R', 'B', 'N'],
            },
            {
                scenario: 'white pieces, flipped orientation',
                color: 'white' as const,
                isFlipped: true,
                expected: ['Q', 'R', 'B', 'N'],
            },
            {
                scenario: 'black pieces, normal orientation',
                color: 'black' as const,
                isFlipped: false,
                expected: ['n', 'b', 'r', 'q'],
            },
            {
                scenario: 'black pieces, flipped orientation (reversed for visual stack)',
                color: 'black' as const,
                isFlipped: true,
                expected: ['q', 'r', 'b', 'n'],
            },
        ])('returns correct promotion options for $scenario', ({ color, isFlipped, expected }) => {
            const result = getPawnPromotionOptions(color, isFlipped);
            expect(result).toStrictEqual(expected);
        });
    });

    describe('getPromptPositionAndSize', () => {
        it.each([
            {
                scenario: 'white pawn at top-left corner, normal orientation',
                promotionIndex: 0, // top-left corner for white's perspective
                color: 'white' as const,
                isFlipped: false,
                expectedTop: 0,
                expectedLeft: 0,
            },
            {
                scenario: 'white pawn at top-right corner, normal orientation',
                promotionIndex: 7, // top-right corner for white's perspective
                color: 'white' as const,
                isFlipped: false,
                expectedTop: 0,
                expectedLeft: 700,
            },
            {
                scenario: 'black pawn at bottom-left corner, normal orientation',
                promotionIndex: 56, // bottom-left corner for white's perspective
                color: 'black' as const,
                isFlipped: false,
                expectedTop: 400,
                expectedLeft: 0,
            },
            {
                scenario: 'white pawn at top-left corner, flipped orientation',
                promotionIndex: 0, // top-left corner for white's perspective
                color: 'white' as const,
                isFlipped: true,
                expectedTop: 700,
                expectedLeft: 700,
            },
            {
                scenario: 'black pawn at top-right corner, flipped orientation',
                promotionIndex: 56, // top-right corner for black's perspective
                color: 'black' as const,
                isFlipped: true,
                expectedTop: 0,
                expectedLeft: 700,
            },
            {
                scenario: 'black pawn at top-left corner, flipped orientation',
                promotionIndex: 63, // top-left corner for black's perspective
                color: 'black' as const,
                isFlipped: true,
                expectedTop: 0,
                expectedLeft: 0,
            },
        ])(
            'calculates correct position for $scenario',
            ({ promotionIndex, color, isFlipped, expectedTop, expectedLeft }) => {
                const result = getPromptPositionAndSize(defaultBoardRect, promotionIndex, color, isFlipped, 4);
                expect(result.top).toBe(expectedTop);
                expect(result.left).toBe(expectedLeft);
            }
        );

        it('returns correct square size based on board width', () => {
            const result = getPromptPositionAndSize(defaultBoardRect, 0, 'white', false, 4);
            expect(result.squareSize).toBe(100); // 800 / 8
        });

        it('calculates correct height for promotion card based on number of options', () => {
            const result = getPromptPositionAndSize(defaultBoardRect, 0, 'white', false, 4);
            expect(result.squareSize * 4).toBe(400); // squareSize (100) * numOptions (4)
        });
    });

    describe('Rendering and Initial State', () => {
        it('renders modal dialog with backdrop', async () => {
            const { getByRole, getByTestId } = await renderPawnPromotionPrompt();

            const dialog = getByRole('dialog');
            await expect.element(dialog).toBeInTheDocument();
            expect(dialog).toHaveAttribute('aria-modal', 'true');
            expect(dialog).toHaveAttribute('tabIndex', '-1');

            const backdrop = getByTestId('backdrop');
            await expect.element(backdrop).toBeInTheDocument();
        });

        it('renders PromotionCard component', async () => {
            const { getByTestId } = await renderPawnPromotionPrompt();

            const promotionCard = getByTestId('promotion-card');
            await expect.element(promotionCard).toBeInTheDocument();
        });

        it('passes correct options to PromotionCard for white pieces', async () => {
            const { getByTestId } = await renderPawnPromotionPrompt({
                propOverrides: { color: 'white', isFlipped: false },
            });

            const promotionCard = getByTestId('promotion-card');
            await expect.element(promotionCard).toBeInTheDocument();

            const optionsText = promotionCard.getByText(/options:/);
            await expect.element(optionsText).toHaveTextContent('["Q","R","B","N"]');
        });

        it('passes correct options to PromotionCard for black pieces on normal board', async () => {
            const { getByTestId } = await renderPawnPromotionPrompt({
                propOverrides: { color: 'black', isFlipped: false },
            });

            const promotionCard = getByTestId('promotion-card');
            await expect.element(promotionCard).toBeInTheDocument();

            const optionsText = promotionCard.getByText(/options:/);
            await expect.element(optionsText).toHaveTextContent('["n","b","r","q"]');
        });

        it('passes reversed options to PromotionCard for black pieces on flipped board', async () => {
            const { getByTestId } = await renderPawnPromotionPrompt({
                propOverrides: { color: 'black', isFlipped: true },
            });

            const promotionCard = getByTestId('promotion-card');
            await expect.element(promotionCard).toBeInTheDocument();

            const optionsText = promotionCard.getByText(/options:/);
            await expect.element(optionsText).toHaveTextContent('["q","r","b","n"]');
        });

        it('passes calculated position and size to PromotionCard', async () => {
            const boardRect: DOMRect = {
                width: 800,
                height: 800,
                top: 0,
                left: 0,
                right: 800,
                bottom: 800,
                x: 0,
                y: 0,
                toJSON: () => {},
            };

            const { getByTestId } = await renderPawnPromotionPrompt({
                propOverrides: {
                    boardRect,
                    promotionIndex: 0,
                    color: 'white',
                    isFlipped: false,
                },
            });

            const promotionCard = getByTestId('promotion-card');
            await expect.element(promotionCard).toBeInTheDocument();

            const squareSizeText = promotionCard.getByText(/squareSize:/);
            await expect.element(squareSizeText).toHaveTextContent('100');

            const styleText = promotionCard.getByText(/style:/);
            await expect.element(styleText).toHaveTextContent('"top":0');
            await expect.element(styleText).toHaveTextContent('"left":0');
        });
    });

    describe('Dismissal Behavior', () => {
        it('calls onDismiss when backdrop is clicked', async () => {
            const onDismiss = vi.fn();
            const { getByTestId } = await renderPawnPromotionPrompt({
                propOverrides: { onDismiss },
            });

            const backdrop = getByTestId('backdrop');
            await backdrop.click();

            expect(onDismiss).toHaveBeenCalledOnce();
        });

        it('calls onDismiss when Escape key is pressed', async () => {
            const onDismiss = vi.fn();
            await renderPawnPromotionPrompt({
                propOverrides: { onDismiss },
            });

            await userEvent.keyboard('{Escape}');

            expect(onDismiss).toHaveBeenCalledOnce();
        });
    });

    describe('Promotion Selection', () => {
        it.each([
            { pieceAlias: 'Q', description: 'Queen' },
            { pieceAlias: 'R', description: 'Rook' },
            { pieceAlias: 'B', description: 'Bishop' },
            { pieceAlias: 'N', description: 'Knight' },
        ])('handles selection of $description correctly', async ({ pieceAlias }) => {
            const promotePawn = vi.fn();
            const onDismiss = vi.fn();
            const chessGameContextValues = createMockChessGameContextValues();
            chessGameContextValues.promotePawn = promotePawn;

            const { getByTestId } = await renderPawnPromotionPrompt({
                propOverrides: { color: 'white', isFlipped: false, onDismiss },
                chessGameContextValues,
            });

            const promotionCard = getByTestId('promotion-card');
            const selectButton = promotionCard.getByTestId(`select-${pieceAlias}`);
            await selectButton.click();

            expect(promotePawn).toHaveBeenCalledExactlyOnceWith(pieceAlias);
            expect(onDismiss).toHaveBeenCalledOnce();
        });
    });

    describe('Board Flipping and Positioning', () => {
        it.each([
            {
                scenario: 'white pawn on normal board',
                color: 'white' as const,
                isFlipped: false,
                promotionIndex: 0,
            },
            {
                scenario: 'white pawn on flipped board',
                color: 'white' as const,
                isFlipped: true,
                promotionIndex: 0,
            },
            {
                scenario: 'black pawn on normal board',
                color: 'black' as const,
                isFlipped: false,
                promotionIndex: 56,
            },
            {
                scenario: 'black pawn on flipped board',
                color: 'black' as const,
                isFlipped: true,
                promotionIndex: 56,
            },
        ])('renders promotion card for $scenario', async ({ color, isFlipped, promotionIndex }) => {
            const { getByTestId } = await renderPawnPromotionPrompt({
                propOverrides: {
                    color,
                    isFlipped,
                    promotionIndex,
                },
            });

            const promotionCard = getByTestId('promotion-card');
            await expect.element(promotionCard).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        it('handles non-square board rectangles gracefully', async () => {
            const nonSquareRect: DOMRect = {
                width: 800,
                height: 600, // Different height
                top: 0,
                left: 0,
                right: 800,
                bottom: 600,
                x: 0,
                y: 0,
                toJSON: () => {},
            };

            const { getByTestId } = await renderPawnPromotionPrompt({
                propOverrides: {
                    boardRect: nonSquareRect,
                    promotionIndex: 0,
                    color: 'white',
                },
            });

            const promotionCard = getByTestId('promotion-card');
            await expect.element(promotionCard).toBeInTheDocument();

            // Should use width for square size calculation (800 / 8 = 100)
            const squareSizeText = promotionCard.getByText(/squareSize:/);
            await expect.element(squareSizeText).toHaveTextContent('100');
        });
    });

    describe('Integration with ChessGame Context', () => {
        it('uses promotePawn from context when piece is selected', async () => {
            const promotePawn = vi.fn();
            const chessGameContextValues = createMockChessGameContextValues();
            chessGameContextValues.promotePawn = promotePawn;

            const { getByTestId } = await renderPawnPromotionPrompt({
                propOverrides: { color: 'white', isFlipped: false },
                chessGameContextValues,
            });

            const promotionCard = getByTestId('promotion-card');
            const selectQueenButton = promotionCard.getByTestId('select-Q');
            await selectQueenButton.click();

            expect(promotePawn).toHaveBeenCalledExactlyOnceWith('Q');
        });

        it('uses cancelPromotion from context when backdrop is clicked', async () => {
            const cancelPromotion = vi.fn();
            const chessGameContextValues = createMockChessGameContextValues();
            chessGameContextValues.cancelPromotion = cancelPromotion;

            const { getByTestId } = await renderPawnPromotionPrompt({
                chessGameContextValues,
            });

            const backdrop = getByTestId('backdrop');
            await backdrop.click();

            expect(cancelPromotion).toHaveBeenCalledOnce();
        });

        it('uses cancelPromotion from context when Escape is pressed', async () => {
            const cancelPromotion = vi.fn();
            const chessGameContextValues = createMockChessGameContextValues();
            chessGameContextValues.cancelPromotion = cancelPromotion;

            await renderPawnPromotionPrompt({
                chessGameContextValues,
            });

            await userEvent.keyboard('{Escape}');

            expect(cancelPromotion).toHaveBeenCalledOnce();
        });
    });
});
