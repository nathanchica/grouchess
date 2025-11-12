import { render } from 'vitest-browser-react';

import Legends, { type LegendsProps } from '../Legends';

describe('Legends', () => {
    const defaultProps: LegendsProps = {
        isDarkSquare: false,
        isPreviousMoveSquare: false,
    };

    type RenderLegendsOptions = {
        propOverrides?: Partial<LegendsProps>;
    };

    function renderLegends({ propOverrides = {} }: RenderLegendsOptions = {}) {
        return render(<Legends {...defaultProps} {...propOverrides} />);
    }

    describe('Conditional Rendering', () => {
        it.each([
            { scenario: 'light square', isDarkSquare: false, isPreviousMoveSquare: false },
            { scenario: 'dark square', isDarkSquare: true, isPreviousMoveSquare: false },
            { scenario: 'light square (previous move)', isDarkSquare: false, isPreviousMoveSquare: true },
            { scenario: 'dark square (previous move)', isDarkSquare: true, isPreviousMoveSquare: true },
        ])(
            'renders both legends when both colLegend and rowLegend are provided on $scenario',
            async ({ isDarkSquare, isPreviousMoveSquare }) => {
                const { getByTestId } = await renderLegends({
                    propOverrides: {
                        colLegend: 'a',
                        rowLegend: '1',
                        isDarkSquare,
                        isPreviousMoveSquare,
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
            { scenario: 'light square', isDarkSquare: false, isPreviousMoveSquare: false },
            { scenario: 'dark square', isDarkSquare: true, isPreviousMoveSquare: false },
            { scenario: 'light square (previous move)', isDarkSquare: false, isPreviousMoveSquare: true },
            { scenario: 'dark square (previous move)', isDarkSquare: true, isPreviousMoveSquare: true },
        ])(
            'renders only row legend when only rowLegend is provided on $scenario',
            async ({ isDarkSquare, isPreviousMoveSquare }) => {
                const { getByTestId } = await renderLegends({
                    propOverrides: {
                        rowLegend: '1',
                        isDarkSquare,
                        isPreviousMoveSquare,
                    },
                });

                const rowLegend = getByTestId('row-legend');
                await expect.element(rowLegend).toBeVisible();
                await expect.element(rowLegend).toHaveTextContent('1');

                // Column legend should not be present
                const colLegend = getByTestId('col-legend');
                await expect.element(colLegend).not.toBeInTheDocument();
            }
        );

        it.each([
            { scenario: 'light square', isDarkSquare: false, isPreviousMoveSquare: false },
            { scenario: 'dark square', isDarkSquare: true, isPreviousMoveSquare: false },
            { scenario: 'light square (previous move)', isDarkSquare: false, isPreviousMoveSquare: true },
            { scenario: 'dark square (previous move)', isDarkSquare: true, isPreviousMoveSquare: true },
        ])(
            'renders only column legend when only colLegend is provided on $scenario',
            async ({ isDarkSquare, isPreviousMoveSquare }) => {
                const { getByTestId } = await renderLegends({
                    propOverrides: {
                        colLegend: 'a',
                        isDarkSquare,
                        isPreviousMoveSquare,
                    },
                });

                const colLegend = getByTestId('col-legend');
                await expect.element(colLegend).toBeVisible();
                await expect.element(colLegend).toHaveTextContent('a');

                // Row legend should not be present
                const rowLegend = getByTestId('row-legend');
                await expect.element(rowLegend).not.toBeInTheDocument();
            }
        );

        it.each([
            { scenario: 'light square', isDarkSquare: false, isPreviousMoveSquare: false },
            { scenario: 'dark square', isDarkSquare: true, isPreviousMoveSquare: false },
            { scenario: 'light square (previous move)', isDarkSquare: false, isPreviousMoveSquare: true },
            { scenario: 'dark square (previous move)', isDarkSquare: true, isPreviousMoveSquare: true },
        ])(
            'renders nothing when both legends are undefined on $scenario',
            async ({ isDarkSquare, isPreviousMoveSquare }) => {
                const { container } = await renderLegends({
                    propOverrides: {
                        isDarkSquare,
                        isPreviousMoveSquare,
                    },
                });

                expect(container).toBeEmptyDOMElement();
            }
        );

        it.each([
            { scenario: 'light square', isDarkSquare: false, isPreviousMoveSquare: false },
            { scenario: 'dark square', isDarkSquare: true, isPreviousMoveSquare: false },
            { scenario: 'light square (previous move)', isDarkSquare: false, isPreviousMoveSquare: true },
            { scenario: 'dark square (previous move)', isDarkSquare: true, isPreviousMoveSquare: true },
        ])(
            'does not render legends when empty strings are provided on $scenario',
            async ({ isDarkSquare, isPreviousMoveSquare }) => {
                const { container } = await renderLegends({
                    propOverrides: {
                        colLegend: '',
                        rowLegend: '',
                        isDarkSquare,
                        isPreviousMoveSquare,
                    },
                });

                expect(container).toBeEmptyDOMElement();
            }
        );
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
});
