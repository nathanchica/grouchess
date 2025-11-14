import type { Piece } from '@grouchess/models';
import { render } from 'vitest-browser-react';

import { ImageContext, type ImageContextType } from '../../../providers/ImagesProvider';
import { createMockImageContextValues } from '../../../providers/__mocks__/ImagesProvider';
import ChessPiece, { arePropsEqual } from '../ChessPiece';

const defaultProps = {
    piece: { alias: 'P' } as Piece,
    showTextDisplay: false,
};

type RenderChessPieceOptions = {
    propOverrides?: Partial<typeof defaultProps>;
    imageContextValues?: ImageContextType;
};

function renderChessPiece({
    propOverrides = {},
    imageContextValues = createMockImageContextValues(),
}: RenderChessPieceOptions = {}) {
    return render(
        <ImageContext.Provider value={imageContextValues}>
            <ChessPiece {...defaultProps} {...propOverrides} />
        </ImageContext.Provider>
    );
}

describe('ChessPiece', () => {
    describe('Fallback Text Display', () => {
        it('switches to text display when image fails to load', async () => {
            const { getByRole, getByText } = await renderChessPiece({
                propOverrides: {
                    piece: { alias: 'P' } as Piece,
                },
            });

            const image = getByRole('img', { name: /white pawn/i });
            await expect.element(image).toBeInTheDocument();

            // Trigger the error event
            const errorEvent = new Event('error');
            image.element().dispatchEvent(errorEvent);

            // Should now show text display
            const pieceElement = getByText('P');
            await expect.element(pieceElement).toBeInTheDocument();
            expect(pieceElement).toHaveTextContent('P');
        });

        it('text fallback has correct aria-label from piece data', async () => {
            const { getByRole, getByText } = await renderChessPiece({
                propOverrides: {
                    piece: { alias: 'P' } as Piece,
                },
            });

            const image = getByRole('img', { name: /white pawn/i });

            // Trigger the error event
            const errorEvent = new Event('error');
            image.element().dispatchEvent(errorEvent);

            const pieceElement = getByText('P');
            await expect.element(pieceElement).toBeInTheDocument();
            expect(pieceElement).toHaveAttribute('aria-label', 'White Pawn');
        });

        it('does not render image after switching to text mode', async () => {
            const { getByRole } = await renderChessPiece({
                propOverrides: {
                    piece: { alias: 'P' } as Piece,
                },
            });

            const image = getByRole('img', { name: /white pawn/i });

            // Trigger the error event
            const errorEvent = new Event('error');
            image.element().dispatchEvent(errorEvent);

            // Image should no longer be in the document
            const images = getByRole('img', { includeHidden: true });
            await expect.element(images).not.toBeInTheDocument();
        });
    });

    describe('Optional showTextDisplay Prop', () => {
        it('renders text display when showTextDisplay is true', async () => {
            const { getByText, getByRole } = await renderChessPiece({
                propOverrides: {
                    piece: { alias: 'P' } as Piece,
                    showTextDisplay: true,
                },
            });

            const pieceElement = getByText('P');
            await expect.element(pieceElement).toBeInTheDocument();
            expect(pieceElement).toHaveTextContent('P');
            expect(pieceElement).toHaveAttribute('aria-label', 'White Pawn');

            // Should not render image
            const images = getByRole('img', { includeHidden: true });
            await expect.element(images).not.toBeInTheDocument();
        });

        it('renders image when showTextDisplay is false', async () => {
            const { getByRole } = await renderChessPiece({
                propOverrides: {
                    piece: { alias: 'P' } as Piece,
                    showTextDisplay: false,
                },
            });

            const image = getByRole('img', { name: /white pawn/i });
            await expect.element(image).toBeInTheDocument();
        });
    });

    describe('Image Display Mode', () => {
        it('renders image by default', async () => {
            const { getByRole } = await renderChessPiece({
                propOverrides: {
                    piece: { alias: 'P' } as Piece,
                },
            });

            const image = getByRole('img', { name: /white pawn/i });
            await expect.element(image).toBeInTheDocument();
        });

        it('uses image source from imgSrcMap context when available', async () => {
            const mockImageContextValues = createMockImageContextValues();
            mockImageContextValues.imgSrcMap = {
                '/pieces/staunty/wP.svg': '/resolved/wP.svg',
            };

            const { getByRole } = await renderChessPiece({
                propOverrides: {
                    piece: { alias: 'P' } as Piece,
                },
                imageContextValues: mockImageContextValues,
            });

            const image = getByRole('img', { name: /white pawn/i });
            expect(image).toHaveAttribute('src', '/resolved/wP.svg');
        });

        it('falls back to imgSrc from aliasToPieceImageData when not in map', async () => {
            const mockImageContextValues = createMockImageContextValues();
            mockImageContextValues.imgSrcMap = {};

            const { getByRole } = await renderChessPiece({
                propOverrides: {
                    piece: { alias: 'P' } as Piece,
                },
                imageContextValues: mockImageContextValues,
            });

            const image = getByRole('img', { name: /white pawn/i });
            expect(image).toHaveAttribute('src', '/pieces/staunty/wP.svg');
        });

        it('sets correct alt text from piece data', async () => {
            const { getByRole } = await renderChessPiece({
                propOverrides: {
                    piece: { alias: 'Q' } as Piece,
                },
            });

            const image = getByRole('img', { name: /white queen/i });
            expect(image).toHaveAttribute('alt', 'White Queen');
        });

        it('image has draggable set to false', async () => {
            const { getByRole } = await renderChessPiece({
                propOverrides: {
                    piece: { alias: 'P' } as Piece,
                },
            });

            const image = getByRole('img', { name: /white pawn/i });
            expect(image).toHaveAttribute('draggable', 'false');
        });

        it('image has loading="eager" and decoding="async" attributes', async () => {
            const { getByRole } = await renderChessPiece({
                propOverrides: {
                    piece: { alias: 'P' } as Piece,
                },
            });

            const image = getByRole('img', { name: /white pawn/i });
            expect(image).toHaveAttribute('loading', 'eager');
            expect(image).toHaveAttribute('decoding', 'async');
        });
    });

    describe('Different Piece Types', () => {
        it.each([
            {
                scenario: 'white pawn',
                alias: 'P',
                expectedAltText: 'White Pawn',
                expectedImgSrc: '/pieces/staunty/wP.svg',
            },
            {
                scenario: 'black knight',
                alias: 'n',
                expectedAltText: 'Black Knight',
                expectedImgSrc: '/pieces/staunty/bN.svg',
            },
            {
                scenario: 'white queen',
                alias: 'Q',
                expectedAltText: 'White Queen',
                expectedImgSrc: '/pieces/staunty/wQ.svg',
            },
            {
                scenario: 'black king',
                alias: 'k',
                expectedAltText: 'Black King',
                expectedImgSrc: '/pieces/staunty/bK.svg',
            },
        ])('renders correctly for $scenario', async ({ alias, expectedAltText, expectedImgSrc }) => {
            const { getByRole } = await renderChessPiece({
                propOverrides: {
                    piece: { alias } as Piece,
                },
            });

            const image = getByRole('img', { name: new RegExp(expectedAltText, 'i') });
            await expect.element(image).toBeInTheDocument();
            expect(image).toHaveAttribute('alt', expectedAltText);
            expect(image).toHaveAttribute('src', expectedImgSrc);
        });
    });
});

describe('arePropsEqual', () => {
    it('returns true when piece alias and showTextDisplay are the same', () => {
        const propsA = {
            piece: { alias: 'P' } as Piece,
            showTextDisplay: false,
        };
        const propsB = {
            piece: { alias: 'P' } as Piece,
            showTextDisplay: false,
        };

        const result = arePropsEqual(propsA, propsB);
        expect(result).toBe(true);
    });

    it('returns true when both props are undefined for showTextDisplay', () => {
        const propsA = {
            piece: { alias: 'P' } as Piece,
        };
        const propsB = {
            piece: { alias: 'P' } as Piece,
        };

        const result = arePropsEqual(propsA, propsB);
        expect(result).toBe(true);
    });

    it.each([
        {
            scenario: 'different piece alias',
            propsA: { piece: { alias: 'P' } as Piece },
            propsB: { piece: { alias: 'N' } as Piece },
        },
        {
            scenario: 'different showTextDisplay',
            propsA: { piece: { alias: 'P' } as Piece, showTextDisplay: false },
            propsB: { piece: { alias: 'P' } as Piece, showTextDisplay: true },
        },
    ])('returns false when $scenario', ({ propsA, propsB }) => {
        const result = arePropsEqual(propsA, propsB);
        expect(result).toBe(false);
    });
});
