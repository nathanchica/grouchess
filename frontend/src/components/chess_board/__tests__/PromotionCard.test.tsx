import type { PawnPromotion } from '@grouchess/models';
import { render } from 'vitest-browser-react';

import { ImageContext, type ImageContextType } from '../../../providers/ImagesProvider';
import { createMockImageContextValues } from '../../../providers/__mocks__/ImagesProvider';
import PromotionCard, { type PromotionCardProps } from '../PromotionCard';

const defaultProps: PromotionCardProps = {
    onSelect: vi.fn(),
    options: ['Q', 'R', 'B', 'N'] as PawnPromotion[],
    squareSize: undefined,
    style: undefined,
};

type RenderPromotionCardOptions = {
    propOverrides?: Partial<PromotionCardProps>;
    imageContextValues?: ImageContextType;
};

function renderPromotionCard({
    propOverrides = {},
    imageContextValues = createMockImageContextValues(),
}: RenderPromotionCardOptions = {}) {
    return render(
        <ImageContext.Provider value={imageContextValues}>
            <PromotionCard {...defaultProps} {...propOverrides} />
        </ImageContext.Provider>
    );
}

describe('PromotionCard', () => {
    describe('Rendering and Initial State', () => {
        it('renders all promotion options as buttons', async () => {
            const imageContextValues = createMockImageContextValues();
            imageContextValues.isReady = false;
            const { getByRole } = await renderPromotionCard({
                propOverrides: { options: ['Q', 'R', 'B', 'N'] as PawnPromotion[] },
                imageContextValues,
            });

            const queenButton = getByRole('button', { name: /Promote to White Queen/i });
            const rookButton = getByRole('button', { name: /Promote to White Rook/i });
            const bishopButton = getByRole('button', { name: /Promote to White Bishop/i });
            const knightButton = getByRole('button', { name: /Promote to White Knight/i });

            await expect.element(queenButton).toBeInTheDocument();
            await expect.element(rookButton).toBeInTheDocument();
            await expect.element(bishopButton).toBeInTheDocument();
            await expect.element(knightButton).toBeInTheDocument();
        });

        it('renders options in the order provided (top to bottom)', async () => {
            const imageContextValues = createMockImageContextValues();
            imageContextValues.isReady = false;
            const { getByRole } = await renderPromotionCard({
                propOverrides: { options: ['N', 'Q', 'R', 'B'] as PawnPromotion[] },
                imageContextValues,
            });

            const buttons = getByRole('button').elements();

            expect(buttons.length).toBe(4);
            expect(buttons[0]).toHaveAttribute('aria-label', 'Promote to White Knight');
            expect(buttons[1]).toHaveAttribute('aria-label', 'Promote to White Queen');
            expect(buttons[2]).toHaveAttribute('aria-label', 'Promote to White Rook');
            expect(buttons[3]).toHaveAttribute('aria-label', 'Promote to White Bishop');
        });

        it.each([
            {
                scenario: 'white pieces',
                options: ['Q', 'R', 'B', 'N'] as PawnPromotion[],
                expectedLabels: [
                    'Promote to White Queen',
                    'Promote to White Rook',
                    'Promote to White Bishop',
                    'Promote to White Knight',
                ],
            },
            {
                scenario: 'black pieces',
                options: ['q', 'r', 'b', 'n'] as PawnPromotion[],
                expectedLabels: [
                    'Promote to Black Queen',
                    'Promote to Black Rook',
                    'Promote to Black Bishop',
                    'Promote to Black Knight',
                ],
            },
        ])('renders with different piece colors ($scenario)', async ({ options, expectedLabels }) => {
            const imageContextValues = createMockImageContextValues();
            imageContextValues.isReady = false;
            const { getByRole } = await renderPromotionCard({
                propOverrides: { options },
                imageContextValues,
            });

            const buttons = getByRole('button').elements();

            expect(buttons.length).toBe(expectedLabels.length);
            buttons.forEach((button, index) => {
                expect(button).toHaveAttribute('aria-label', expectedLabels[index]);
            });
        });

        it('renders with explicit squareSize and style props', async () => {
            const imageContextValues = createMockImageContextValues();
            imageContextValues.isReady = false;
            const squareSize = 60;
            const customStyle = { top: '100px', left: '200px' };
            const { getByRole } = await renderPromotionCard({
                propOverrides: {
                    options: ['Q', 'R'] as PawnPromotion[],
                    squareSize,
                    style: customStyle,
                },
                imageContextValues,
            });

            const buttons = getByRole('button').elements();

            expect(buttons[0]).toHaveAttribute('aria-label', 'Promote to White Queen');
            expect(buttons[1]).toHaveAttribute('aria-label', 'Promote to White Rook');
        });
    });

    describe('Image Loading States', () => {
        it('shows text fallback when images are not loaded', async () => {
            const imageContextValues = createMockImageContextValues();
            imageContextValues.isReady = false;
            const { getByRole } = await renderPromotionCard({
                propOverrides: { options: ['Q', 'R', 'B', 'N'] as PawnPromotion[] },
                imageContextValues,
            });

            const queenButton = getByRole('button', { name: /Promote to White Queen/i });
            const rookButton = getByRole('button', { name: /Promote to White Rook/i });
            const bishopButton = getByRole('button', { name: /Promote to White Bishop/i });
            const knightButton = getByRole('button', { name: /Promote to White Knight/i });

            // Verify text content is visible
            await expect.element(queenButton).toHaveTextContent('Q');
            await expect.element(rookButton).toHaveTextContent('R');
            await expect.element(bishopButton).toHaveTextContent('B');
            await expect.element(knightButton).toHaveTextContent('N');

            // Verify no images are rendered
            const images = getByRole('img', { includeHidden: true }).elements();
            expect(images.length).toBe(0);
        });

        it('shows chess piece images when images are loaded', async () => {
            const imageContextValues = createMockImageContextValues();
            imageContextValues.isReady = true;
            imageContextValues.imgSrcMap = {
                '/pieces/staunty/wQ.svg': 'blob:http://localhost/queen-blob',
                '/pieces/staunty/wR.svg': 'blob:http://localhost/rook-blob',
                '/pieces/staunty/wB.svg': 'blob:http://localhost/bishop-blob',
                '/pieces/staunty/wN.svg': 'blob:http://localhost/knight-blob',
            };
            const { getByRole } = await renderPromotionCard({
                propOverrides: { options: ['Q', 'R', 'B', 'N'] as PawnPromotion[] },
                imageContextValues,
            });

            const images = getByRole('img').elements();

            expect(images.length).toBe(4);
            expect(images[0]).toHaveAttribute('src', 'blob:http://localhost/queen-blob');
            expect(images[0]).toHaveAttribute('alt', 'White Queen');
            expect(images[1]).toHaveAttribute('src', 'blob:http://localhost/rook-blob');
            expect(images[1]).toHaveAttribute('alt', 'White Rook');
            expect(images[2]).toHaveAttribute('src', 'blob:http://localhost/bishop-blob');
            expect(images[2]).toHaveAttribute('alt', 'White Bishop');
            expect(images[3]).toHaveAttribute('src', 'blob:http://localhost/knight-blob');
            expect(images[3]).toHaveAttribute('alt', 'White Knight');
        });

        it('uses mapped image sources from context', async () => {
            const customBlobUrl = 'blob:http://localhost/custom-queen-blob';
            const imageContextValues = createMockImageContextValues();
            imageContextValues.isReady = true;
            imageContextValues.imgSrcMap = {
                '/pieces/staunty/wQ.svg': customBlobUrl,
            };
            const { getByRole } = await renderPromotionCard({
                propOverrides: { options: ['Q'] as PawnPromotion[] },
                imageContextValues,
            });

            const image = getByRole('img', { name: /White Queen/i });

            await expect.element(image).toHaveAttribute('src', customBlobUrl);
        });

        it('falls back to original image source if not in imgSrcMap', async () => {
            const imageContextValues = createMockImageContextValues();
            imageContextValues.isReady = true;
            imageContextValues.imgSrcMap = {}; // Empty map, no blob URLs
            const { getByRole } = await renderPromotionCard({
                propOverrides: { options: ['Q'] as PawnPromotion[] },
                imageContextValues,
            });

            const image = getByRole('img', { name: /White Queen/i });

            // Should use original path since it's not in imgSrcMap
            await expect.element(image).toHaveAttribute('src', '/pieces/staunty/wQ.svg');
        });
    });

    describe('User Interactions', () => {
        it('calls onSelect with correct piece alias when button is clicked', async () => {
            const onSelect = vi.fn();
            const imageContextValues = createMockImageContextValues();
            imageContextValues.isReady = false;
            const { getByRole } = await renderPromotionCard({
                propOverrides: { onSelect, options: ['Q', 'R', 'B', 'N'] as PawnPromotion[] },
                imageContextValues,
            });

            const queenButton = getByRole('button', { name: /Promote to White Queen/i });

            await queenButton.click();

            expect(onSelect).toHaveBeenCalledExactlyOnceWith('Q');
        });

        it('multiple clicks on the same button call onSelect multiple times', async () => {
            const onSelect = vi.fn();
            const imageContextValues = createMockImageContextValues();
            imageContextValues.isReady = false;
            const { getByRole } = await renderPromotionCard({
                propOverrides: { onSelect, options: ['Q'] as PawnPromotion[] },
                imageContextValues,
            });

            const queenButton = getByRole('button', { name: /Promote to White Queen/i });

            await queenButton.click();
            await queenButton.click();
            await queenButton.click();

            expect(onSelect).toHaveBeenCalledTimes(3);
            expect(onSelect).toHaveBeenNthCalledWith(1, 'Q');
            expect(onSelect).toHaveBeenNthCalledWith(2, 'Q');
            expect(onSelect).toHaveBeenNthCalledWith(3, 'Q');
        });

        it('clicking different buttons calls onSelect with different values', async () => {
            const onSelect = vi.fn();
            const imageContextValues = createMockImageContextValues();
            imageContextValues.isReady = false;
            const { getByRole } = await renderPromotionCard({
                propOverrides: { onSelect, options: ['Q', 'R', 'B', 'N'] as PawnPromotion[] },
                imageContextValues,
            });

            const queenButton = getByRole('button', { name: /Promote to White Queen/i });
            const rookButton = getByRole('button', { name: /Promote to White Rook/i });
            const bishopButton = getByRole('button', { name: /Promote to White Bishop/i });

            await queenButton.click();
            await rookButton.click();
            await bishopButton.click();

            expect(onSelect).toHaveBeenCalledTimes(3);
            expect(onSelect).toHaveBeenNthCalledWith(1, 'Q');
            expect(onSelect).toHaveBeenNthCalledWith(2, 'R');
            expect(onSelect).toHaveBeenNthCalledWith(3, 'B');
        });

        it.each([
            { scenario: 'images loaded', isReady: true },
            { scenario: 'images not loaded', isReady: false },
        ])('onSelect is called regardless of image loading state ($scenario)', async ({ isReady }) => {
            const onSelect = vi.fn();
            const imageContextValues = createMockImageContextValues();
            imageContextValues.isReady = isReady;
            if (isReady) {
                imageContextValues.imgSrcMap = {
                    '/pieces/staunty/wQ.svg': 'blob:http://localhost/queen-blob',
                };
            }
            const { getByRole } = await renderPromotionCard({
                propOverrides: { onSelect, options: ['Q'] as PawnPromotion[] },
                imageContextValues,
            });

            const queenButton = getByRole('button', { name: /Promote to White Queen/i });

            await queenButton.click();

            expect(onSelect).toHaveBeenCalledExactlyOnceWith('Q');
        });
    });

    describe('Accessibility', () => {
        it('buttons are keyboard navigable', async () => {
            const onSelect = vi.fn();
            const imageContextValues = createMockImageContextValues();
            imageContextValues.isReady = false;
            const { getByRole } = await renderPromotionCard({
                propOverrides: { onSelect, options: ['Q', 'R', 'B', 'N'] as PawnPromotion[] },
                imageContextValues,
            });

            const queenButton = getByRole('button', { name: /Promote to White Queen/i });
            const rookButton = getByRole('button', { name: /Promote to White Rook/i });

            // Click first button to focus it
            await queenButton.click();
            await expect.element(queenButton).toHaveFocus();

            expect(onSelect).toHaveBeenCalledExactlyOnceWith('Q');

            // Click second button to focus it
            await rookButton.click();
            await expect.element(rookButton).toHaveFocus();

            expect(onSelect).toHaveBeenCalledTimes(2);
            expect(onSelect).toHaveBeenNthCalledWith(2, 'R');
        });
    });

    describe('Edge Cases', () => {
        it('renders with single option', async () => {
            const imageContextValues = createMockImageContextValues();
            imageContextValues.isReady = false;
            const { getByRole } = await renderPromotionCard({
                propOverrides: { options: ['Q'] as PawnPromotion[] },
                imageContextValues,
            });

            const buttons = getByRole('button').elements();

            expect(buttons.length).toBe(1);
            expect(buttons[0]).toHaveAttribute('aria-label', 'Promote to White Queen');
            await expect.element(buttons[0]).toHaveTextContent('Q');
        });

        it('renders with empty options array', async () => {
            const imageContextValues = createMockImageContextValues();
            imageContextValues.isReady = false;
            const { container, getByRole } = await renderPromotionCard({
                propOverrides: { options: [] as PawnPromotion[] },
                imageContextValues,
            });

            // Container should render but have no buttons
            expect(container).not.toBeEmptyDOMElement();

            const buttons = getByRole('button').elements();
            expect(buttons.length).toBe(0);
        });
    });
});
