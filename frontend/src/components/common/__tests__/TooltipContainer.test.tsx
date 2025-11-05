import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import TooltipContainer from '../TooltipContainer';

describe('TooltipContainer', () => {
    it('renders children correctly', async () => {
        const { getByRole } = await render(
            <TooltipContainer tooltipText="Test tooltip">
                <button>Click me</button>
            </TooltipContainer>
        );

        const button = getByRole('button', { name: /click me/i });
        await expect.element(button).toBeInTheDocument();
    });

    it('renders tooltip with correct text', async () => {
        const { getByRole } = await render(
            <TooltipContainer tooltipText="Helpful information">
                <button>Hover me</button>
            </TooltipContainer>
        );

        const tooltip = getByRole('tooltip');
        await expect.element(tooltip).toBeInTheDocument();
        await expect.element(tooltip).toHaveTextContent('Helpful information');
    });

    it('links tooltip to children via aria-describedby and id', async () => {
        const { container, getByRole } = await render(
            <TooltipContainer tooltipText="Tooltip text">
                <button>Button</button>
            </TooltipContainer>
        );

        const tooltip = container.querySelector('[role="tooltip"]');
        const tooltipId = tooltip?.getAttribute('id');

        const button = getByRole('button', { name: /button/i });
        await expect.element(button).toHaveAttribute('aria-describedby', tooltipId);
    });

    it('preserves existing aria-describedby attribute', async () => {
        const { container } = await render(
            <TooltipContainer tooltipText="Additional info">
                <button aria-describedby="existing-id">Button</button>
            </TooltipContainer>
        );

        const button = container.querySelector('button');
        const describedBy = button?.getAttribute('aria-describedby');

        expect(describedBy).toContain('existing-id');
        expect(describedBy?.split(' ').length).toBeGreaterThan(1);
    });

    it('generates unique IDs for multiple instances', async () => {
        const { container } = await render(
            <div>
                <TooltipContainer tooltipText="First tooltip">
                    <button>Button 1</button>
                </TooltipContainer>
                <TooltipContainer tooltipText="Second tooltip">
                    <button>Button 2</button>
                </TooltipContainer>
            </div>
        );

        const tooltips = container.querySelectorAll('[role="tooltip"]');
        const buttons = container.querySelectorAll('button');

        const id1 = tooltips[0].getAttribute('id');
        const id2 = tooltips[1].getAttribute('id');
        const describedBy1 = buttons[0].getAttribute('aria-describedby');
        const describedBy2 = buttons[1].getAttribute('aria-describedby');

        expect(id1).not.toBe(id2);
        expect(describedBy1).toBe(id1);
        expect(describedBy2).toBe(id2);
    });

    it('shows tooltip on button hover', async () => {
        const { getByRole } = await render(
            <TooltipContainer tooltipText="Hover text">
                <button>Hover button</button>
            </TooltipContainer>
        );

        await page.getByRole('button', { name: /hover button/i }).hover();

        const tooltip = getByRole('tooltip');
        await expect.element(tooltip).toBeVisible();
        await expect.element(tooltip).toHaveTextContent('Hover text');
    });

    it('tooltip is accessible when button is focused', async () => {
        const { container } = await render(
            <TooltipContainer tooltipText="Focus text">
                <button>Focus button</button>
            </TooltipContainer>
        );

        const button = page.getByRole('button', { name: /focus button/i });
        await button.click();

        await expect.element(button).toHaveFocus();

        // Verify aria-describedby links to tooltip for screen readers
        const buttonElement = container.querySelector('button');
        const tooltip = container.querySelector('[role="tooltip"]');
        const describedBy = buttonElement?.getAttribute('aria-describedby');
        const tooltipId = tooltip?.getAttribute('id');
        expect(tooltipId).toBe(describedBy);
    });

    it('works with different child element types', async () => {
        const { container, getByPlaceholder } = await render(
            <TooltipContainer tooltipText="Input tooltip">
                <input type="text" placeholder="Enter text" />
            </TooltipContainer>
        );

        const input = getByPlaceholder('Enter text');
        const tooltip = container.querySelector('[role="tooltip"]');

        await expect.element(input).toHaveAttribute('aria-describedby', tooltip?.getAttribute('id'));
    });

    it('handles empty tooltip text', async () => {
        const { getByRole } = await render(
            <TooltipContainer tooltipText="">
                <button>Button</button>
            </TooltipContainer>
        );

        const tooltip = getByRole('tooltip');
        await expect.element(tooltip).toHaveTextContent('');
    });
});
