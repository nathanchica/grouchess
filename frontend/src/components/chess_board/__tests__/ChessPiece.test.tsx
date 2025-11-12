import type { Piece } from '@grouchess/models';
import { render } from 'vitest-browser-react';

import { ImageContext, type ImageContextType } from '../../../providers/ImagesProvider';
import { createMockImageContextValues } from '../../../providers/__mocks__/ImagesProvider';
import ChessPiece, { arePropsEqual } from '../ChessPiece';

const defaultProps = {
    piece: { alias: 'P' } as Piece,
    showTextDisplay: false,
    onPointerDown: vi.fn(),
    onImgLoadError: vi.fn(),
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
    describe('Text Display Mode', () => {
        it('renders span with piece alias when showTextDisplay is true', async () => {
            const { getByText } = await renderChessPiece({
                propOverrides: {
                    piece: { alias: 'P' } as Piece,
                    showTextDisplay: true,
                },
            });

            const pieceElement = getByText('P');
            await expect.element(pieceElement).toBeInTheDocument();
            expect(pieceElement).toHaveTextContent('P');
        });

        it('span has correct aria-label from piece data', async () => {
            const { getByText } = await renderChessPiece({
                propOverrides: {
                    piece: { alias: 'P' } as Piece,
                    showTextDisplay: true,
                },
            });

            const pieceElement = getByText('P');
            expect(pieceElement).toHaveAttribute('aria-label', 'White Pawn');
        });

        it('does not render image when in text mode', async () => {
            const { getByRole } = await renderChessPiece({
                propOverrides: {
                    piece: { alias: 'P' } as Piece,
                    showTextDisplay: true,
                },
            });

            const images = getByRole('img', { includeHidden: true });
            await expect.element(images).not.toBeInTheDocument();
        });
    });

    describe('Image Display Mode', () => {
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

        it('uses image source from imgSrcMap context when available', async () => {
            const mockImageContextValues = createMockImageContextValues();
            mockImageContextValues.imgSrcMap = {
                '/pieces/staunty/wP.svg': '/resolved/wP.svg',
            };

            const { getByRole } = await renderChessPiece({
                propOverrides: {
                    piece: { alias: 'P' } as Piece,
                    showTextDisplay: false,
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
                    showTextDisplay: false,
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
                    showTextDisplay: false,
                },
            });

            const image = getByRole('img', { name: /white queen/i });
            expect(image).toHaveAttribute('alt', 'White Queen');
        });

        it('image has draggable set to false', async () => {
            const { getByRole } = await renderChessPiece({
                propOverrides: {
                    piece: { alias: 'P' } as Piece,
                    showTextDisplay: false,
                },
            });

            const image = getByRole('img', { name: /white pawn/i });
            expect(image).toHaveAttribute('draggable', 'false');
        });

        it('image has loading="eager" and decoding="async" attributes', async () => {
            const { getByRole } = await renderChessPiece({
                propOverrides: {
                    piece: { alias: 'P' } as Piece,
                    showTextDisplay: false,
                },
            });

            const image = getByRole('img', { name: /white pawn/i });
            expect(image).toHaveAttribute('loading', 'eager');
            expect(image).toHaveAttribute('decoding', 'async');
        });
    });

    describe('Event Handlers', () => {
        it('calls onPointerDown when pointer down event occurs on image', async () => {
            const onPointerDown = vi.fn();
            const { getByRole } = await renderChessPiece({
                propOverrides: {
                    piece: { alias: 'P' } as Piece,
                    showTextDisplay: false,
                    onPointerDown,
                },
            });

            const image = getByRole('img', { name: /white pawn/i });
            await image.click();

            expect(onPointerDown).toHaveBeenCalledOnce();
        });

        it('calls onImgLoadError when image fails to load', async () => {
            const onImgLoadError = vi.fn();
            const { getByRole } = await renderChessPiece({
                propOverrides: {
                    piece: { alias: 'P' } as Piece,
                    showTextDisplay: false,
                    onImgLoadError,
                },
            });

            const image = getByRole('img', { name: /white pawn/i });

            // Trigger the error event
            const errorEvent = new Event('error');
            image.element().dispatchEvent(errorEvent);

            expect(onImgLoadError).toHaveBeenCalledOnce();
        });

        it('does not call onPointerDown in text display mode', async () => {
            const onPointerDown = vi.fn();
            const { getByText } = await renderChessPiece({
                propOverrides: {
                    piece: { alias: 'P' } as Piece,
                    showTextDisplay: true,
                    onPointerDown,
                },
            });

            const pieceElement = getByText('P');
            await pieceElement.click();

            expect(onPointerDown).not.toHaveBeenCalled();
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
            // Test text mode
            const { getByText } = await renderChessPiece({
                propOverrides: {
                    piece: { alias } as Piece,
                    showTextDisplay: true,
                },
            });

            const textElement = getByText(alias);
            await expect.element(textElement).toBeInTheDocument();
            expect(textElement).toHaveAttribute('aria-label', expectedAltText);

            const { getByRole } = await renderChessPiece({
                propOverrides: {
                    piece: { alias } as Piece,
                    showTextDisplay: false,
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
    it('returns true for identical props', () => {
        const propsA = {
            ...defaultProps,
        };
        const propsB = {
            ...propsA,
        };

        const result = arePropsEqual(propsA, propsB);
        expect(result).toBe(true);
    });

    it.each([
        {
            scenario: 'different piece alias',
            propsAOverrides: { piece: { alias: 'P' } as Piece },
            propsBOverrides: { piece: { alias: 'N' } as Piece },
        },
        {
            scenario: 'different showTextDisplay',
            propsAOverrides: { showTextDisplay: false },
            propsBOverrides: { showTextDisplay: true },
        },
        {
            scenario: 'different onPointerDown',
            propsAOverrides: { onPointerDown: vi.fn() },
            propsBOverrides: { onPointerDown: vi.fn() },
        },
        {
            scenario: 'different onImgLoadError',
            propsAOverrides: { onImgLoadError: vi.fn() },
            propsBOverrides: { onImgLoadError: vi.fn() },
        },
    ])('returns false when piece alias differs', ({ propsAOverrides, propsBOverrides }) => {
        const propsA = {
            ...defaultProps,
            ...propsAOverrides,
        };
        const propsB = {
            ...propsA,
            ...propsBOverrides,
        };

        const result = arePropsEqual(propsA, propsB);
        expect(result).toBe(false);
    });
});
