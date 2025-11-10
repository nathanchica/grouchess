import { createMockMoveNotation } from '@grouchess/test-utils';
import { render } from 'vitest-browser-react';

import MoveHistoryTableRow, { type MoveHistoryTableRowProps } from '../MoveHistoryTableRow';

const defaultWhiteMove = createMockMoveNotation();
const defaultBlackMove = createMockMoveNotation({
    figurine: '\u265Ec6',
    san: 'Nc6',
    uci: 'b8c6',
});

const defaultProps: MoveHistoryTableRowProps = {
    movePair: [defaultWhiteMove, defaultBlackMove],
    moveNumber: 1,
    isLastRow: false,
    lastMoveIsBlack: false,
};

const renderRow = (props: Partial<MoveHistoryTableRowProps> = {}) => {
    return render(
        <table>
            <tbody>
                <MoveHistoryTableRow {...defaultProps} {...props} />
            </tbody>
        </table>
    );
};

describe('MoveHistoryTableRow', () => {
    describe('Basic Rendering', () => {
        it('renders complete move pair with both white and black moves', async () => {
            const { getByText } = await renderRow();

            await expect.element(getByText(defaultProps.movePair[0].figurine)).toBeInTheDocument();
            await expect.element(getByText(defaultProps.movePair[1].figurine)).toBeInTheDocument();
        });

        it("renders incomplete move pair with only white's move", async () => {
            const { getByText } = await renderRow({ movePair: [defaultWhiteMove] });

            await expect.element(getByText(defaultWhiteMove.figurine)).toBeInTheDocument();
            await expect.element(getByText('—')).toBeInTheDocument();
        });

        it.each([{ moveNumber: 1 }, { moveNumber: 10 }, { moveNumber: 42 }])(
            'renders move number $moveNumber correctly',
            async ({ moveNumber }) => {
                const { getByText } = await renderRow({ moveNumber });

                await expect.element(getByText(`${moveNumber}.`)).toBeInTheDocument();
            }
        );
    });

    describe('Notation Style Display', () => {
        it('displays figurine notation by default', async () => {
            const { getByText } = await renderRow();

            await expect.element(getByText(defaultWhiteMove.figurine)).toBeInTheDocument();
            await expect.element(getByText(defaultBlackMove.figurine)).toBeInTheDocument();
            await expect.element(getByText(defaultWhiteMove.san)).not.toBeInTheDocument();
            await expect.element(getByText(defaultBlackMove.san)).not.toBeInTheDocument();
            await expect.element(getByText(defaultWhiteMove.uci as string)).not.toBeInTheDocument();
            await expect.element(getByText(defaultBlackMove.uci as string)).not.toBeInTheDocument();
        });

        it.each([
            {
                scenario: 'figurine notation (default)',
                notationStyle: undefined,
                expectedWhite: '\u265Ef3',
                expectedBlack: '\u265Ec6',
            },
            {
                scenario: 'san notation',
                notationStyle: 'san' as const,
                expectedWhite: 'Nf3',
                expectedBlack: 'Nc6',
            },
            {
                scenario: 'uci notation',
                notationStyle: 'uci' as const,
                expectedWhite: 'g1f3',
                expectedBlack: 'b8c6',
            },
        ])('displays $scenario correctly', async ({ notationStyle, expectedWhite, expectedBlack }) => {
            const { getByText } = await renderRow({ notationStyle });

            await expect.element(getByText(expectedWhite)).toBeInTheDocument();
            await expect.element(getByText(expectedBlack)).toBeInTheDocument();
        });
    });

    describe('Active Move Highlighting', () => {
        it('highlights white move when it is the last move', async () => {
            const { getByText } = await renderRow({ isLastRow: true, lastMoveIsBlack: false });

            const whiteMoveElement = getByText(defaultWhiteMove.figurine);
            const blackMoveElement = getByText(defaultBlackMove.figurine);

            await expect.element(whiteMoveElement).toHaveAttribute('aria-current', 'step');
            await expect.element(blackMoveElement).not.toHaveAttribute('aria-current');
        });

        it('highlights black move when it is the last move', async () => {
            const { getByText } = await renderRow({ isLastRow: true, lastMoveIsBlack: true });

            const whiteMoveElement = getByText(defaultWhiteMove.figurine);
            const blackMoveElement = getByText(defaultBlackMove.figurine);

            await expect.element(blackMoveElement).toHaveAttribute('aria-current', 'step');
            await expect.element(whiteMoveElement).not.toHaveAttribute('aria-current');
        });

        it.each([
            {
                isLastRow: false,
                lastMoveIsBlack: false,
                scenario: 'non-last row with white to move',
            },
            {
                isLastRow: false,
                lastMoveIsBlack: true,
                scenario: 'non-last row with black to move',
            },
        ])('does not highlight any move for $scenario', async ({ isLastRow, lastMoveIsBlack }) => {
            const { getByText } = await renderRow({ isLastRow, lastMoveIsBlack });

            const whiteMoveElement = getByText(defaultWhiteMove.figurine);
            const blackMoveElement = getByText(defaultBlackMove.figurine);

            await expect.element(whiteMoveElement).not.toHaveAttribute('aria-current');
            await expect.element(blackMoveElement).not.toHaveAttribute('aria-current');
        });

        it("highlights white's move when it's the only move in last row", async () => {
            const { getByText } = await renderRow({
                movePair: [defaultWhiteMove],
                isLastRow: true,
                lastMoveIsBlack: false,
            });

            const whiteMoveElement = getByText(defaultWhiteMove.figurine);

            await expect.element(whiteMoveElement).toHaveAttribute('aria-current', 'step');
        });
    });

    describe('Accessibility', () => {
        it('provides aria-labels for moves', async () => {
            const { getByText } = await renderRow();

            const whiteMoveElement = getByText(defaultWhiteMove.figurine);
            const blackMoveElement = getByText(defaultBlackMove.figurine);

            await expect.element(whiteMoveElement).toHaveAttribute('aria-label', defaultWhiteMove.san);
            await expect.element(blackMoveElement).toHaveAttribute('aria-label', defaultBlackMove.san);
        });

        it('aria-label uses san notation regardless of displayed notation style', async () => {
            const { getByText } = await renderRow({ notationStyle: 'uci' });

            const whiteMoveElement = getByText(defaultWhiteMove.uci as string);
            const blackMoveElement = getByText(defaultBlackMove.uci as string);

            await expect.element(whiteMoveElement).toHaveAttribute('aria-label', defaultWhiteMove.san);
            await expect.element(blackMoveElement).toHaveAttribute('aria-label', defaultBlackMove.san);
        });
    });

    describe('Edge Cases', () => {
        it('handles missing optional notation properties gracefully by falling back to san notation', async () => {
            // TODO: Implement
            const props = structuredClone(defaultProps);
            props.movePair[0].uci = undefined;
            props.movePair[1].uci = undefined;
            const { getByText } = await renderRow({ ...props, notationStyle: 'uci' });

            const whiteMove = props.movePair[0];
            const blackMove = props.movePair[1];

            const whiteMoveElement = getByText(whiteMove.san);
            const blackMoveElement = getByText(blackMove.san);

            await expect.element(whiteMoveElement).toBeInTheDocument();
            await expect.element(blackMoveElement).toBeInTheDocument();
        });
    });
});
