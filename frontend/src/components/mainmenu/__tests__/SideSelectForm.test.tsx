import type { PieceColor } from '@grouchess/models';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import SideSelectForm from '../SideSelectForm';

describe('SideSelectForm', () => {
    const defaultProps = {
        onSideSelect: vi.fn(),
    };

    describe('Initial Render and Display', () => {
        it('renders with all three options visible', async () => {
            await render(<SideSelectForm {...defaultProps} />);

            const whiteOption = page.getByRole('radio', { name: /play as white/i });
            const blackOption = page.getByRole('radio', { name: /play as black/i });
            const randomOption = page.getByRole('radio', { name: /play as random side/i });

            await expect.element(whiteOption).toBeVisible();
            await expect.element(blackOption).toBeVisible();
            await expect.element(randomOption).toBeVisible();
        });

        it('has no option selected by default when initialSide is not provided', async () => {
            await render(<SideSelectForm {...defaultProps} />);

            const whiteOption = page.getByRole('radio', { name: /play as white/i });
            const blackOption = page.getByRole('radio', { name: /play as black/i });
            const randomOption = page.getByRole('radio', { name: /play as random side/i });

            await expect.element(whiteOption).not.toBeChecked();
            await expect.element(blackOption).not.toBeChecked();
            await expect.element(randomOption).not.toBeChecked();
        });

        it.each([
            { initialSide: 'white' as PieceColor, expectedSelected: 'White' },
            { initialSide: 'black' as PieceColor, expectedSelected: 'Black' },
        ])(
            'displays $expectedSelected as selected when initialSide is $initialSide',
            async ({ initialSide, expectedSelected }) => {
                await render(<SideSelectForm {...defaultProps} initialSide={initialSide} />);

                const selectedOption = page.getByRole('radio', {
                    name: new RegExp(`play as ${expectedSelected}`, 'i'),
                });

                await expect.element(selectedOption).toBeChecked();
            }
        );

        it('has no option selected when initialSide is null', async () => {
            await render(<SideSelectForm {...defaultProps} initialSide={null} />);

            const whiteOption = page.getByRole('radio', { name: /play as white/i });
            const blackOption = page.getByRole('radio', { name: /play as black/i });
            const randomOption = page.getByRole('radio', { name: /play as random side/i });

            await expect.element(whiteOption).not.toBeChecked();
            await expect.element(blackOption).not.toBeChecked();
            await expect.element(randomOption).not.toBeChecked();
        });
    });

    describe('User Interactions and State Changes', () => {
        it.each([
            { option: 'White', expectedCallback: 'white' as PieceColor },
            { option: 'Black', expectedCallback: 'black' as PieceColor },
            { option: 'Random Side', expectedCallback: null },
        ])(
            'selecting $option option updates state and calls callback with $expectedCallback',
            async ({ option, expectedCallback }) => {
                const onSideSelect = vi.fn();
                await render(<SideSelectForm onSideSelect={onSideSelect} />);

                await page.getByText(option, { exact: true }).click();

                const optionButton = page.getByRole('radio', {
                    name: new RegExp(`play as ${option}`, 'i'),
                });
                await expect.element(optionButton).toBeChecked();
                expect(onSideSelect).toHaveBeenCalledWith(expectedCallback);
                expect(onSideSelect).toHaveBeenCalledTimes(1);
            }
        );

        it.each([
            { from: 'white' as PieceColor, to: 'Black', expectedCallback: 'black' as PieceColor },
            { from: 'black' as PieceColor, to: 'Random Side', expectedCallback: null },
            { from: null, to: 'White', expectedCallback: 'white' as PieceColor },
        ])('changes selection from $from to $to', async ({ from, to, expectedCallback }) => {
            const onSideSelect = vi.fn();
            await render(<SideSelectForm onSideSelect={onSideSelect} initialSide={from} />);

            await page.getByText(to, { exact: true }).click();

            const newOption = page.getByRole('radio', {
                name: new RegExp(`play as ${to}`, 'i'),
            });
            await expect.element(newOption).toBeChecked();
            expect(onSideSelect).toHaveBeenCalledWith(expectedCallback);
            expect(onSideSelect).toHaveBeenCalledTimes(1);
        });

        it('re-selecting already selected option does not call callback again', async () => {
            const onSideSelect = vi.fn();
            await render(<SideSelectForm onSideSelect={onSideSelect} initialSide="white" />);

            const whiteOption = page.getByRole('radio', { name: /play as white/i });

            await expect.element(whiteOption).toBeChecked();
            expect(onSideSelect).not.toHaveBeenCalled();

            await page.getByText('White', { exact: true }).click();

            // Radio buttons don't trigger onChange when clicking already-selected option
            await expect.element(whiteOption).toBeChecked();
            expect(onSideSelect).not.toHaveBeenCalled();
        });
    });

    describe('Accessibility', () => {
        it('supports arrow key navigation between radio options', async () => {
            const onSideSelect = vi.fn();
            const { getByRole } = await render(<SideSelectForm onSideSelect={onSideSelect} initialSide="white" />);

            const whiteOption = getByRole('radio', { name: /play as white/i });
            const blackOption = getByRole('radio', { name: /play as black/i });
            const randomOption = getByRole('radio', { name: /play as random side/i });

            // Tab to the selected radio button (white)
            await userEvent.tab();
            await expect.element(whiteOption).toHaveFocus();

            // Arrow right should move to next option and select it
            await userEvent.keyboard('{ArrowRight}');
            await expect.element(blackOption).toHaveFocus();
            await expect.element(blackOption).toBeChecked();
            expect(onSideSelect).toHaveBeenCalledWith('black');

            // Arrow down should also move to next option
            await userEvent.keyboard('{ArrowDown}');
            await expect.element(randomOption).toHaveFocus();
            await expect.element(randomOption).toBeChecked();
            expect(onSideSelect).toHaveBeenCalledWith(null);

            // Arrow left should move back to previous option
            await userEvent.keyboard('{ArrowLeft}');
            await expect.element(blackOption).toHaveFocus();
            await expect.element(blackOption).toBeChecked();

            // Arrow up should also move to previous option
            await userEvent.keyboard('{ArrowUp}');
            await expect.element(whiteOption).toHaveFocus();
            await expect.element(whiteOption).toBeChecked();
            expect(onSideSelect).toHaveBeenCalledWith('white');
        });
    });
});
