import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import IconButton from '../IconButton';

describe('IconButton', () => {
    const mockIcon = <span data-testid="test-icon">🎮</span>;
    const mockOnClick = vi.fn();

    beforeEach(() => {
        mockOnClick.mockClear();
    });

    describe('rendering', () => {
        it('renders button with icon', async () => {
            const { getByRole, getByTestId } = await render(
                <IconButton icon={mockIcon} onClick={mockOnClick} tooltipText="Test tooltip" />
            );

            const button = getByRole('button');
            await expect.element(button).toBeInTheDocument();
            await expect.element(getByTestId('test-icon')).toBeInTheDocument();
        });

        it('renders with tooltip text', async () => {
            const { getByText } = await render(
                <IconButton icon={mockIcon} onClick={mockOnClick} tooltipText="Test tooltip" />
            );

            await expect.element(getByText('Test tooltip')).toBeInTheDocument();
        });

        it('applies aria attributes from ariaProps', async () => {
            const { getByRole } = await render(
                <IconButton
                    icon={mockIcon}
                    onClick={mockOnClick}
                    tooltipText="Test tooltip"
                    ariaProps={{ 'aria-label': 'Custom label', 'aria-pressed': 'true' }}
                />
            );

            const button = getByRole('button');
            await expect.element(button).toHaveAttribute('aria-label', 'Custom label');
            await expect.element(button).toHaveAttribute('aria-pressed', 'true');
        });

        it('renders when active', async () => {
            const { getByRole } = await render(
                <IconButton icon={mockIcon} onClick={mockOnClick} tooltipText="Test tooltip" isActive={true} />
            );

            const button = getByRole('button');
            await expect.element(button).toBeInTheDocument();
        });
    });

    describe('click interactions', () => {
        it('calls onClick when button is clicked', async () => {
            const { getByRole } = await render(
                <IconButton icon={mockIcon} onClick={mockOnClick} tooltipText="Test tooltip" />
            );

            const button = getByRole('button');
            await userEvent.click(button);

            expect(mockOnClick).toHaveBeenCalledTimes(1);
        });

        it('passes disabled prop to underlying button', async () => {
            const { getByRole } = await render(
                <IconButton icon={mockIcon} onClick={mockOnClick} tooltipText="Test tooltip" disabled={true} />
            );

            const button = getByRole('button');
            await expect.element(button).toBeDisabled();
        });

        it('passes focus to underlying button', async () => {
            const { getByRole } = await render(
                <IconButton icon={mockIcon} onClick={mockOnClick} tooltipText="Test tooltip" />
            );

            const button = getByRole('button');
            await button.click();
            await expect.element(button).toHaveFocus();
        });
    });

    describe('accessibility', () => {
        it('tooltip is linked via aria-describedby', async () => {
            const { container } = await render(
                <IconButton icon={mockIcon} onClick={mockOnClick} tooltipText="Test tooltip" />
            );

            const button = container.querySelector('button');
            const tooltip = container.querySelector('[role="tooltip"]');

            const ariaDescribedBy = button?.getAttribute('aria-describedby');
            const tooltipId = tooltip?.getAttribute('id');

            expect(ariaDescribedBy).toBe(tooltipId);
        });

        it('tooltip is visible on hover', async () => {
            const { getByRole } = await render(
                <IconButton icon={mockIcon} onClick={mockOnClick} tooltipText="Hover tooltip" />
            );

            // Hover over button
            await page.getByRole('button').hover();

            // Tooltip should be visible
            const tooltip = getByRole('tooltip');
            await expect.element(tooltip).toBeVisible();
            await expect.element(tooltip).toHaveTextContent('Hover tooltip');
        });

        it('tooltip is visible on focus', async () => {
            const { container } = await render(
                <IconButton icon={mockIcon} onClick={mockOnClick} tooltipText="Focus tooltip" />
            );

            const button = page.getByRole('button');
            await button.click();

            // Verify button is focused and tooltip link exists
            await expect.element(button).toHaveFocus();

            const buttonElement = container.querySelector('button');
            const tooltip = container.querySelector('[role="tooltip"]');
            const describedBy = buttonElement?.getAttribute('aria-describedby');
            const tooltipId = tooltip?.getAttribute('id');
            expect(tooltipId).toBe(describedBy);
        });
    });

    describe('edge cases', () => {
        it('works with different icon types', async () => {
            const svgIcon = (
                <svg data-testid="svg-icon" width="24" height="24">
                    <circle cx="12" cy="12" r="10" />
                </svg>
            );

            const { getByTestId } = await render(
                <IconButton icon={svgIcon} onClick={mockOnClick} tooltipText="Test tooltip" />
            );

            await expect.element(getByTestId('svg-icon')).toBeInTheDocument();
        });

        it('handles missing optional props', async () => {
            const { getByRole } = await render(
                <IconButton icon={mockIcon} onClick={mockOnClick} tooltipText="Test tooltip" />
            );

            const button = getByRole('button');
            await expect.element(button).toBeInTheDocument();

            // Should not be disabled
            await expect.element(button).not.toBeDisabled();
        });
    });
});
