import { render } from 'vitest-browser-react';

import Legends, { type LegendsProps } from '../Legends';

describe('Legends', () => {
    const defaultProps: LegendsProps = {};

    type RenderLegendsOptions = {
        propOverrides?: Partial<LegendsProps>;
    };

    function renderLegends({ propOverrides = {} }: RenderLegendsOptions = {}) {
        return render(<Legends {...defaultProps} {...propOverrides} />);
    }

    describe('Conditional Rendering', () => {
        it.each([
            { scenario: 'default (dark) variant', variant: undefined },
            { scenario: 'dark variant', variant: 'dark' as const },
            { scenario: 'light variant', variant: 'light' as const },
        ])(
            'renders both legends when both colLegend and rowLegend are provided with $scenario',
            async ({ variant }) => {
                const { getByTestId } = await renderLegends({
                    propOverrides: {
                        colLegend: 'a',
                        rowLegend: '1',
                        variant,
                    },
                });

                const colLegend = getByTestId('col-legend');
                const rowLegend = getByTestId('row-legend');

                await expect.element(colLegend).toBeVisible();
                await expect.element(colLegend).toHaveTextContent('a');
                await expect.element(rowLegend).toBeVisible();
                await expect.element(rowLegend).toHaveTextContent('1');
            }
        );

        it.each([
            { scenario: 'default (dark) variant', variant: undefined },
            { scenario: 'dark variant', variant: 'dark' as const },
            { scenario: 'light variant', variant: 'light' as const },
        ])('renders only row legend when only rowLegend is provided with $scenario', async ({ variant }) => {
            const { getByTestId } = await renderLegends({
                propOverrides: {
                    rowLegend: '1',
                    variant,
                },
            });

            const rowLegend = getByTestId('row-legend');
            await expect.element(rowLegend).toBeVisible();
            await expect.element(rowLegend).toHaveTextContent('1');

            // Column legend should not be present
            const colLegend = getByTestId('col-legend');
            await expect.element(colLegend).not.toBeInTheDocument();
        });

        it.each([
            { scenario: 'default (dark) variant', variant: undefined },
            { scenario: 'dark variant', variant: 'dark' as const },
            { scenario: 'light variant', variant: 'light' as const },
        ])('renders only column legend when only colLegend is provided with $scenario', async ({ variant }) => {
            const { getByTestId } = await renderLegends({
                propOverrides: {
                    colLegend: 'a',
                    variant,
                },
            });

            const colLegend = getByTestId('col-legend');
            await expect.element(colLegend).toBeVisible();
            await expect.element(colLegend).toHaveTextContent('a');

            // Row legend should not be present
            const rowLegend = getByTestId('row-legend');
            await expect.element(rowLegend).not.toBeInTheDocument();
        });

        it.each([
            { scenario: 'default (dark) variant', variant: undefined },
            { scenario: 'dark variant', variant: 'dark' as const },
            { scenario: 'light variant', variant: 'light' as const },
        ])('renders nothing when both legends are undefined with $scenario', async ({ variant }) => {
            const { container } = await renderLegends({
                propOverrides: {
                    variant,
                },
            });

            expect(container).toBeEmptyDOMElement();
        });

        it.each([
            { scenario: 'default (dark) variant', variant: undefined },
            { scenario: 'dark variant', variant: 'dark' as const },
            { scenario: 'light variant', variant: 'light' as const },
        ])('does not render legends when empty strings are provided with $scenario', async ({ variant }) => {
            const { container } = await renderLegends({
                propOverrides: {
                    colLegend: '',
                    rowLegend: '',
                    variant,
                },
            });

            expect(container).toBeEmptyDOMElement();
        });
    });

    describe('Different Legend Values', () => {
        it.each([
            { colLegend: 'a' },
            { colLegend: 'b' },
            { colLegend: 'c' },
            { colLegend: 'd' },
            { colLegend: 'e' },
            { colLegend: 'f' },
            { colLegend: 'g' },
            { colLegend: 'h' },
        ])('renders column legend "$colLegend" correctly', async ({ colLegend }) => {
            const { getByTestId } = await renderLegends({
                propOverrides: {
                    colLegend,
                },
            });

            const colLegendElement = getByTestId('col-legend');
            await expect.element(colLegendElement).toBeVisible();
            await expect.element(colLegendElement).toHaveTextContent(colLegend);
        });

        it.each([
            { rowLegend: '1' },
            { rowLegend: '2' },
            { rowLegend: '3' },
            { rowLegend: '4' },
            { rowLegend: '5' },
            { rowLegend: '6' },
            { rowLegend: '7' },
            { rowLegend: '8' },
        ])('renders row legend "$rowLegend" correctly', async ({ rowLegend }) => {
            const { getByTestId } = await renderLegends({
                propOverrides: {
                    rowLegend,
                },
            });

            const rowLegendElement = getByTestId('row-legend');
            await expect.element(rowLegendElement).toBeVisible();
            await expect.element(rowLegendElement).toHaveTextContent(rowLegend);
        });
    });

    describe('Variant Styles', () => {
        it('applies dark text color when variant is dark', async () => {
            const { getByTestId } = await renderLegends({
                propOverrides: {
                    colLegend: 'a',
                    variant: 'dark',
                },
            });

            const colLegend = getByTestId('col-legend');
            expect(colLegend).toHaveClass('text-zinc-500');
        });

        it('applies dark text color by default (when variant is undefined)', async () => {
            const { getByTestId } = await renderLegends({
                propOverrides: {
                    colLegend: 'a',
                },
            });

            const colLegend = getByTestId('col-legend');
            expect(colLegend).toHaveClass('text-zinc-500');
        });

        it('applies light text color when variant is light', async () => {
            const { getByTestId } = await renderLegends({
                propOverrides: {
                    colLegend: 'a',
                    variant: 'light',
                },
            });

            const colLegend = getByTestId('col-legend');
            expect(colLegend).toHaveClass('text-zinc-100');
        });
    });
});
