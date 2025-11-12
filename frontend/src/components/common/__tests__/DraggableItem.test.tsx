import { render } from 'vitest-browser-react';

import DraggableItem, { calculateStyle, type DraggableItemProps } from '../DraggableItem';

describe('calculateStyle', () => {
    it.each([
        {
            scenario: 'centers the item when centered is true',
            x: 100,
            y: 50,
            width: 40,
            height: 40,
            centered: true,
            expected: {
                transform: 'translate(80px, 30px)',
                width: '40px',
                height: '40px',
            },
        },
        {
            scenario: 'centers the item when centered is not provided (default)',
            x: 100,
            y: 50,
            width: 40,
            height: 40,
            centered: undefined,
            expected: {
                transform: 'translate(80px, 30px)',
                width: '40px',
                height: '40px',
            },
        },
        {
            scenario: 'does not center when centered is false',
            x: 100,
            y: 50,
            width: 40,
            height: 40,
            centered: false,
            expected: {
                transform: 'translate(100px, 50px)',
                width: '40px',
                height: '40px',
            },
        },
        {
            scenario: 'handles zero coordinates when centered',
            x: 0,
            y: 0,
            width: 20,
            height: 20,
            centered: true,
            expected: {
                transform: 'translate(-10px, -10px)',
                width: '20px',
                height: '20px',
            },
        },
        {
            scenario: 'handles zero coordinates when not centered',
            x: 0,
            y: 0,
            width: 20,
            height: 20,
            centered: false,
            expected: {
                transform: 'translate(0px, 0px)',
                width: '20px',
                height: '20px',
            },
        },
        {
            scenario: 'handles negative coordinates when centered',
            x: -50,
            y: -30,
            width: 60,
            height: 40,
            centered: true,
            expected: {
                transform: 'translate(-80px, -50px)',
                width: '60px',
                height: '40px',
            },
        },
        {
            scenario: 'handles different width and height when centered',
            x: 200,
            y: 150,
            width: 80,
            height: 120,
            centered: true,
            expected: {
                transform: 'translate(160px, 90px)',
                width: '80px',
                height: '120px',
            },
        },
        {
            scenario: 'handles fractional dimensions when centered',
            x: 100,
            y: 100,
            width: 33,
            height: 55,
            centered: true,
            expected: {
                transform: 'translate(83.5px, 72.5px)',
                width: '33px',
                height: '55px',
            },
        },
    ])('$scenario', ({ x, y, width, height, centered, expected }) => {
        const result = calculateStyle(x, y, width, height, centered);
        expect(result).toEqual(expected);
    });
});

describe('DraggableItem', () => {
    const defaultProps: DraggableItemProps = {
        x: 100,
        y: 100,
        width: 40,
        height: 40,
        children: <div>Test Content</div>,
    };

    it('renders children content', async () => {
        const { getByText } = await render(<DraggableItem {...defaultProps} />);

        const content = getByText('Test Content');
        await expect.element(content).toBeInTheDocument();
    });

    it('renders with centered prop set to true', async () => {
        const { getByText } = await render(<DraggableItem {...defaultProps} centered={true} />);

        const content = getByText('Test Content');
        await expect.element(content).toBeInTheDocument();
    });

    it('renders with centered prop set to false', async () => {
        const { getByText } = await render(<DraggableItem {...defaultProps} centered={false} />);

        const content = getByText('Test Content');
        await expect.element(content).toBeInTheDocument();
    });

    it('renders with custom className', async () => {
        const { getByText } = await render(<DraggableItem {...defaultProps} className="custom-draggable-class" />);

        const content = getByText('Test Content');
        await expect.element(content).toBeInTheDocument();
    });

    it('renders with empty className', async () => {
        const { getByText } = await render(<DraggableItem {...defaultProps} className="" />);

        const content = getByText('Test Content');
        await expect.element(content).toBeInTheDocument();
    });

    it.each([
        {
            scenario: 'at origin',
            x: 0,
            y: 0,
            width: 20,
            height: 20,
            centered: true,
        },
        {
            scenario: 'at positive coordinates',
            x: 150,
            y: 200,
            width: 50,
            height: 60,
            centered: true,
        },
        {
            scenario: 'with large dimensions',
            x: 100,
            y: 100,
            width: 200,
            height: 150,
            centered: false,
        },
        {
            scenario: 'with negative coordinates',
            x: -50,
            y: -30,
            width: 40,
            height: 40,
            centered: true,
        },
        {
            scenario: 'with fractional dimensions',
            x: 100,
            y: 100,
            width: 33,
            height: 55,
            centered: false,
        },
    ])('renders with $scenario', async ({ x, y, width, height, centered }) => {
        const { getByText } = await render(
            <DraggableItem x={x} y={y} width={width} height={height} centered={centered}>
                <div>Content</div>
            </DraggableItem>
        );

        const content = getByText('Content');
        await expect.element(content).toBeInTheDocument();
    });

    it('renders complex children correctly', async () => {
        const complexChildren = (
            <div>
                <span>First</span>
                <span>Second</span>
                <button type="button">Click me</button>
            </div>
        );

        const { getByText, getByRole } = await render(
            <DraggableItem {...defaultProps}>{complexChildren}</DraggableItem>
        );

        await expect.element(getByText('First')).toBeInTheDocument();
        await expect.element(getByText('Second')).toBeInTheDocument();
        await expect.element(getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('renders with different children types', async () => {
        const { getByText } = await render(
            <DraggableItem {...defaultProps}>
                <span>Span child</span>
            </DraggableItem>
        );

        await expect.element(getByText('Span child')).toBeInTheDocument();
    });

    it('renders with text node as children', async () => {
        const { getByText } = await render(<DraggableItem {...defaultProps}>Plain text child</DraggableItem>);

        await expect.element(getByText('Plain text child')).toBeInTheDocument();
    });
});
