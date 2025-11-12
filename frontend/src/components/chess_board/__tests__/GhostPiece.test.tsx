import type { PieceAlias } from '@grouchess/models';
import { render } from 'vitest-browser-react';

import { ImageContext, type ImageContextType } from '../../../providers/ImagesProvider';
import { createMockImageContextValues } from '../../../providers/__mocks__/ImagesProvider';
import GhostPiece, { type GhostPieceProps } from '../GhostPiece';

type RenderGhostPieceOptions = {
    propOverrides?: {
        dragProps?: GhostPieceProps['dragProps'];
        pieceAlias?: PieceAlias;
    };
    imageContextValues?: ImageContextType;
};

const defaultDragProps: GhostPieceProps['dragProps'] = {
    x: 100,
    y: 150,
    width: 80,
    height: 80,
};

const defaultProps = {
    dragProps: defaultDragProps,
    pieceAlias: 'P' as PieceAlias,
};

function renderGhostPiece({
    propOverrides = {},
    imageContextValues = createMockImageContextValues(),
}: RenderGhostPieceOptions = {}) {
    return render(
        <ImageContext.Provider value={imageContextValues}>
            <GhostPiece {...defaultProps} {...propOverrides} />
        </ImageContext.Provider>
    );
}

describe('GhostPiece', () => {
    describe('Basic Rendering', () => {
        it('renders ghost piece image with correct piece', async () => {
            const { getByRole } = await renderGhostPiece({
                propOverrides: { pieceAlias: 'P' },
            });

            const image = getByRole('img', { name: /white pawn/i });
            await expect.element(image).toBeInTheDocument();
        });

        it('renders with non-draggable attribute', async () => {
            const { getByRole } = await renderGhostPiece();

            const image = getByRole('img', { name: /white pawn/i });
            expect(image).toHaveAttribute('draggable', 'false');
        });
    });

    describe('Piece Variations', () => {
        it.each([
            { pieceAlias: 'P' as PieceAlias, expectedAlt: 'White Pawn' },
            { pieceAlias: 'N' as PieceAlias, expectedAlt: 'White Knight' },
            { pieceAlias: 'B' as PieceAlias, expectedAlt: 'White Bishop' },
            { pieceAlias: 'R' as PieceAlias, expectedAlt: 'White Rook' },
            { pieceAlias: 'Q' as PieceAlias, expectedAlt: 'White Queen' },
            { pieceAlias: 'K' as PieceAlias, expectedAlt: 'White King' },
        ])('renders white piece $pieceAlias with correct alt text', async ({ pieceAlias, expectedAlt }) => {
            const { getByRole } = await renderGhostPiece({
                propOverrides: { pieceAlias },
            });

            const image = getByRole('img', { name: new RegExp(expectedAlt, 'i') });
            await expect.element(image).toBeInTheDocument();
            expect(image).toHaveAttribute('alt', expectedAlt);
        });

        it.each([
            { pieceAlias: 'p' as PieceAlias, expectedAlt: 'Black Pawn' },
            { pieceAlias: 'n' as PieceAlias, expectedAlt: 'Black Knight' },
            { pieceAlias: 'b' as PieceAlias, expectedAlt: 'Black Bishop' },
            { pieceAlias: 'r' as PieceAlias, expectedAlt: 'Black Rook' },
            { pieceAlias: 'q' as PieceAlias, expectedAlt: 'Black Queen' },
            { pieceAlias: 'k' as PieceAlias, expectedAlt: 'Black King' },
        ])('renders black piece $pieceAlias with correct alt text', async ({ pieceAlias, expectedAlt }) => {
            const { getByRole } = await renderGhostPiece({
                propOverrides: { pieceAlias },
            });

            const image = getByRole('img', { name: new RegExp(expectedAlt, 'i') });
            await expect.element(image).toBeInTheDocument();
            expect(image).toHaveAttribute('alt', expectedAlt);
        });
    });

    describe('Image Resolution via ImagesProvider', () => {
        it('uses resolved image source from imgSrcMap when available', async () => {
            const mockImageContextValues = createMockImageContextValues();
            mockImageContextValues.imgSrcMap = {
                '/pieces/staunty/wP.svg': '/resolved/wP.svg',
            };

            const { getByRole } = await renderGhostPiece({
                propOverrides: { pieceAlias: 'P' },
                imageContextValues: mockImageContextValues,
            });

            const image = getByRole('img', { name: /white pawn/i });
            expect(image).toHaveAttribute('src', '/resolved/wP.svg');
        });

        it('falls back to original imgSrc when not in imgSrcMap', async () => {
            const mockImageContextValues = createMockImageContextValues();
            mockImageContextValues.imgSrcMap = {};

            const { getByRole } = await renderGhostPiece({
                propOverrides: { pieceAlias: 'P' },
                imageContextValues: mockImageContextValues,
            });

            const image = getByRole('img', { name: /white pawn/i });
            expect(image).toHaveAttribute('src', '/pieces/staunty/wP.svg');
        });

        it('handles empty imgSrcMap gracefully', async () => {
            const mockImageContextValues = createMockImageContextValues();
            mockImageContextValues.imgSrcMap = {};

            const { getByRole } = await renderGhostPiece({
                propOverrides: { pieceAlias: 'P' },
                imageContextValues: mockImageContextValues,
            });

            const image = getByRole('img', { name: /white pawn/i });
            await expect.element(image).toBeInTheDocument();
            expect(image).toHaveAttribute('src', '/pieces/staunty/wP.svg');
        });
    });
});
