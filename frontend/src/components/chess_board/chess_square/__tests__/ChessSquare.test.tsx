import { render } from 'vitest-browser-react';

import type { GlowingSquareProps } from '../../../../utils/types';
import ChessSquare, { arePropsEqual, type ChessSquareProps } from '../ChessSquare';
import type { LegendsProps } from '../Legends';

vi.mock('../Legends', () => ({
    default: ({ colLegend, rowLegend }: LegendsProps) => {
        if (!colLegend && !rowLegend) {
            return null;
        }
        return <div data-testid="legends-mock">Legends Mock</div>;
    },
}));

describe('ChessSquare', () => {
    const defaultGlowingSquareProps: GlowingSquareProps = {
        isPreviousMove: false,
        isCheck: false,
        isSelected: false,
        isDraggingOver: false,
        canCapture: false,
        canMove: false,
    };

    const defaultProps: ChessSquareProps = {
        index: 0,
        glowingSquareProps: defaultGlowingSquareProps,
        children: <div data-testid="test-child">Child Content</div>,
        isFlipped: false,
    };

    type RenderChessSquareOptions = {
        propOverrides?: Partial<ChessSquareProps>;
    };

    function renderChessSquare({ propOverrides = {} }: RenderChessSquareOptions = {}) {
        return render(<ChessSquare {...defaultProps} {...propOverrides} />);
    }

    describe('Basic Rendering', () => {
        it('renders a gridcell with proper role', async () => {
            const { getByRole } = await renderChessSquare();
            const gridcell = getByRole('gridcell');
            await expect.element(gridcell).toBeInTheDocument();
        });

        it.each([
            { index: 0, expectedLabel: 'a8' },
            { index: 7, expectedLabel: 'h8' },
            { index: 56, expectedLabel: 'a1' },
            { index: 63, expectedLabel: 'h1' },
            { index: 27, expectedLabel: 'd5' },
            { index: 36, expectedLabel: 'e4' },
        ])('renders with correct aria-label for index $index', async ({ index, expectedLabel }) => {
            const { getByRole } = await renderChessSquare({
                propOverrides: { index },
            });
            const gridcell = getByRole('gridcell', { name: expectedLabel });
            await expect.element(gridcell).toBeInTheDocument();
        });

        it('renders with different child content', async () => {
            const customChild = <span data-testid="custom-child">Custom Content</span>;
            const { getByTestId } = await renderChessSquare({
                propOverrides: { children: customChild },
            });
            const child = getByTestId('custom-child');
            await expect.element(child).toBeInTheDocument();
            await expect.element(child).toHaveTextContent('Custom Content');
        });
    });

    describe('Capture Overlay Display', () => {
        it('shows capture overlay when canCapture is true and not selected', async () => {
            const { getByTestId } = await renderChessSquare({
                propOverrides: {
                    glowingSquareProps: {
                        ...defaultGlowingSquareProps,
                        canCapture: true,
                        isSelected: false,
                    },
                },
            });
            const overlay = getByTestId('capture-overlay');
            await expect.element(overlay).toBeInTheDocument();
        });

        it('hides capture overlay when isSelected is true even if canCapture is true', async () => {
            const { getByTestId } = await renderChessSquare({
                propOverrides: {
                    glowingSquareProps: {
                        ...defaultGlowingSquareProps,
                        canCapture: true,
                        isSelected: true,
                    },
                },
            });
            const overlay = getByTestId('capture-overlay');
            await expect.element(overlay).not.toBeInTheDocument();
        });

        it('hides capture overlay when canCapture is false', async () => {
            const { getByTestId } = await renderChessSquare({
                propOverrides: {
                    glowingSquareProps: {
                        ...defaultGlowingSquareProps,
                        canCapture: false,
                        isSelected: false,
                    },
                },
            });
            const overlay = getByTestId('capture-overlay');
            await expect.element(overlay).not.toBeInTheDocument();
        });

        it('hides capture overlay when canCapture is undefined', async () => {
            const { getByTestId } = await renderChessSquare({
                propOverrides: {
                    glowingSquareProps: {
                        ...defaultGlowingSquareProps,
                        canCapture: undefined,
                        isSelected: false,
                    },
                },
            });
            const overlay = getByTestId('capture-overlay');
            await expect.element(overlay).not.toBeInTheDocument();
        });

        it('hides capture overlay when glowingSquareProps is undefined', async () => {
            const { getByTestId } = await renderChessSquare({
                propOverrides: {
                    glowingSquareProps: undefined,
                },
            });
            const overlay = getByTestId('capture-overlay');
            await expect.element(overlay).not.toBeInTheDocument();
        });
    });

    describe('Legends Display', () => {
        it('renders legends for corner square with both row and column legends', async () => {
            const { getByTestId } = await renderChessSquare({
                propOverrides: { index: 56, isFlipped: false }, // a1 square
            });

            const legends = getByTestId('legends-mock');
            await expect.element(legends).toBeInTheDocument();
        });

        it('renders legends for edge square with only row legend', async () => {
            const { getByTestId } = await renderChessSquare({
                propOverrides: { index: 0, isFlipped: false }, // a8 square
            });

            const legends = getByTestId('legends-mock');
            await expect.element(legends).toBeInTheDocument();
        });

        it('does not render legends for non-edge square', async () => {
            const { getByTestId } = await renderChessSquare({
                propOverrides: { index: 27, isFlipped: false }, // d5 square
            });

            const legends = getByTestId('legends-mock');
            await expect.element(legends).not.toBeInTheDocument();
        });

        it('renders legends for flipped board corner square', async () => {
            const { getByTestId } = await renderChessSquare({
                propOverrides: { index: 7, isFlipped: true }, // h8 square when flipped
            });

            const legends = getByTestId('legends-mock');
            await expect.element(legends).toBeInTheDocument();
        });

        it('does not render legends for non-edge square on flipped board', async () => {
            const { getByTestId } = await renderChessSquare({
                propOverrides: { index: 27, isFlipped: true }, // d5 square when flipped
            });

            const legends = getByTestId('legends-mock');
            await expect.element(legends).not.toBeInTheDocument();
        });
    });

    describe('Glowing Square Props Variations', () => {
        it('renders with isPreviousMove true', async () => {
            const { getByRole } = await renderChessSquare({
                propOverrides: {
                    glowingSquareProps: {
                        ...defaultGlowingSquareProps,
                        isPreviousMove: true,
                    },
                },
            });
            const gridcell = getByRole('gridcell');
            await expect.element(gridcell).toBeInTheDocument();
        });

        it('renders with isCheck true', async () => {
            const { getByRole } = await renderChessSquare({
                propOverrides: {
                    glowingSquareProps: {
                        ...defaultGlowingSquareProps,
                        isCheck: true,
                    },
                },
            });
            const gridcell = getByRole('gridcell');
            await expect.element(gridcell).toBeInTheDocument();
        });

        it('renders with isSelected true', async () => {
            const { getByRole } = await renderChessSquare({
                propOverrides: {
                    glowingSquareProps: {
                        ...defaultGlowingSquareProps,
                        isSelected: true,
                    },
                },
            });
            const gridcell = getByRole('gridcell');
            await expect.element(gridcell).toBeInTheDocument();
        });

        it('renders with isDraggingOver true', async () => {
            const { getByRole } = await renderChessSquare({
                propOverrides: {
                    glowingSquareProps: {
                        ...defaultGlowingSquareProps,
                        isDraggingOver: true,
                    },
                },
            });
            const gridcell = getByRole('gridcell');
            await expect.element(gridcell).toBeInTheDocument();
        });

        it('renders with canMove true', async () => {
            const { getByRole } = await renderChessSquare({
                propOverrides: {
                    glowingSquareProps: {
                        ...defaultGlowingSquareProps,
                        canMove: true,
                    },
                },
            });
            const gridcell = getByRole('gridcell');
            await expect.element(gridcell).toBeInTheDocument();
        });

        it('renders with multiple glowing props enabled', async () => {
            const { getByRole } = await renderChessSquare({
                propOverrides: {
                    glowingSquareProps: {
                        isPreviousMove: true,
                        isCheck: true,
                        isSelected: true,
                        isDraggingOver: true,
                        canCapture: true,
                        canMove: true,
                    },
                },
            });
            const gridcell = getByRole('gridcell');
            await expect.element(gridcell).toBeInTheDocument();
        });

        it('renders correctly when glowingSquareProps is undefined', async () => {
            const { getByRole } = await renderChessSquare({
                propOverrides: {
                    glowingSquareProps: undefined,
                },
            });
            const gridcell = getByRole('gridcell');
            await expect.element(gridcell).toBeInTheDocument();
        });
    });

    describe('arePropsEqual Memoization', () => {
        it('returns true when all props are equal', () => {
            const props1: ChessSquareProps = { ...defaultProps };
            const props2: ChessSquareProps = { ...defaultProps };

            expect(arePropsEqual(props1, props2)).toBe(true);
        });

        it('returns false when index changes', () => {
            const props1: ChessSquareProps = { ...defaultProps };
            const props2: ChessSquareProps = { ...defaultProps, index: 1 };

            expect(arePropsEqual(props1, props2)).toBe(false);
        });

        it('returns false when isFlipped changes', () => {
            const props1: ChessSquareProps = { ...defaultProps };
            const props2: ChessSquareProps = { ...defaultProps, isFlipped: true };

            expect(arePropsEqual(props1, props2)).toBe(false);
        });

        it('returns false when children change', () => {
            const props1: ChessSquareProps = { ...defaultProps };
            const props2: ChessSquareProps = { ...defaultProps, children: <div>Test 2</div> };

            expect(arePropsEqual(props1, props2)).toBe(false);
        });

        it.each([
            { prop: 'isPreviousMove', value: true },
            { prop: 'isCheck', value: true },
            { prop: 'isSelected', value: true },
            { prop: 'isDraggingOver', value: true },
            { prop: 'canCapture', value: true },
            { prop: 'canMove', value: true },
        ])('returns false when glowingSquareProps.$prop changes', ({ prop, value }) => {
            const props1: ChessSquareProps = { ...defaultProps };
            const props2: ChessSquareProps = {
                ...defaultProps,
                glowingSquareProps: {
                    ...defaultGlowingSquareProps,
                    [prop]: value,
                },
            };

            expect(arePropsEqual(props1, props2)).toBe(false);
        });

        it('returns true when glowingSquareProps reference changes but values are the same', () => {
            const glowingProps = {
                isPreviousMove: true,
                isCheck: false,
                isSelected: false,
                isDraggingOver: false,
                canCapture: false,
                canMove: false,
            };
            const props1: ChessSquareProps = {
                ...defaultProps,
                glowingSquareProps: glowingProps,
            };
            const props2: ChessSquareProps = {
                ...defaultProps,
                glowingSquareProps: { ...glowingProps },
            };

            expect(arePropsEqual(props1, props2)).toBe(true);
        });

        it('returns true when both glowingSquareProps are undefined', () => {
            const props1: ChessSquareProps = {
                ...defaultProps,
                glowingSquareProps: undefined,
            };
            const props2: ChessSquareProps = {
                ...defaultProps,
                glowingSquareProps: undefined,
            };

            expect(arePropsEqual(props1, props2)).toBe(true);
        });

        it('returns false when one glowingSquareProps is undefined and the other is defined', () => {
            const props1: ChessSquareProps = {
                ...defaultProps,
                glowingSquareProps: undefined,
            };
            const props2: ChessSquareProps = {
                ...defaultProps,
                glowingSquareProps: defaultGlowingSquareProps,
            };

            expect(arePropsEqual(props1, props2)).toBe(false);
        });

        it('returns false when one glowingSquareProps is defined and the other is undefined', () => {
            const props1: ChessSquareProps = {
                ...defaultProps,
                glowingSquareProps: defaultGlowingSquareProps,
            };
            const props2: ChessSquareProps = {
                ...defaultProps,
                glowingSquareProps: undefined,
            };

            expect(arePropsEqual(props1, props2)).toBe(false);
        });
    });
});
