import { createRef } from 'react';

import { render } from 'vitest-browser-react';

import GameBoard, { type GameBoardProps } from '../GameBoard';

describe('GameBoard', () => {
    // Common test utilities
    const defaultProps: GameBoardProps = {
        onPointerDown: vi.fn(),
        onPointerMove: vi.fn(),
        onPointerUp: vi.fn(),
        onPointerCancel: vi.fn(),
        children: <div data-testid="test-child">Test Child</div>,
    };

    function renderGameBoard(propOverrides: Partial<GameBoardProps> = {}) {
        return render(<GameBoard {...defaultProps} {...propOverrides} />);
    }

    describe('Rendering', () => {
        it('renders grid container with correct role', async () => {
            const { getByRole } = await renderGameBoard();

            const grid = getByRole('grid');
            await expect.element(grid).toBeInTheDocument();
        });

        it('renders children correctly', async () => {
            const { getByTestId } = await renderGameBoard();

            const child = getByTestId('test-child');
            await expect.element(child).toBeInTheDocument();
            await expect.element(child).toHaveTextContent('Test Child');
        });
    });

    describe('Pointer Event Handling', () => {
        it('calls onPointerDown when pointer down event occurs', async () => {
            const onPointerDown = vi.fn();
            const { getByRole } = await renderGameBoard({ onPointerDown });

            const grid = getByRole('grid');
            grid.element().dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

            expect(onPointerDown).toHaveBeenCalledExactlyOnceWith(
                expect.objectContaining({
                    type: 'pointerdown',
                })
            );
        });

        it('calls onPointerMove when pointer move event occurs', async () => {
            const onPointerMove = vi.fn();
            const { getByRole } = await renderGameBoard({ onPointerMove });

            const grid = getByRole('grid');
            grid.element().dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));

            expect(onPointerMove).toHaveBeenCalledExactlyOnceWith(
                expect.objectContaining({
                    type: 'pointermove',
                })
            );
        });

        it('calls onPointerUp when pointer up event occurs', async () => {
            const onPointerUp = vi.fn();
            const { getByRole } = await renderGameBoard({ onPointerUp });

            const grid = getByRole('grid');
            grid.element().dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

            expect(onPointerUp).toHaveBeenCalledExactlyOnceWith(
                expect.objectContaining({
                    type: 'pointerup',
                })
            );
        });

        it('calls onPointerCancel when pointer cancel event occurs', async () => {
            const onPointerCancel = vi.fn();
            const { getByRole } = await renderGameBoard({ onPointerCancel });

            const grid = getByRole('grid');
            grid.element().dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }));

            expect(onPointerCancel).toHaveBeenCalledExactlyOnceWith(
                expect.objectContaining({
                    type: 'pointercancel',
                })
            );
        });

        it('handles pointer event sequence (down → move → up)', async () => {
            const onPointerDown = vi.fn();
            const onPointerMove = vi.fn();
            const onPointerUp = vi.fn();
            const { getByRole } = await renderGameBoard({
                onPointerDown,
                onPointerMove,
                onPointerUp,
            });

            const grid = getByRole('grid');

            grid.element().dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
            expect(onPointerDown).toHaveBeenCalledOnce();

            grid.element().dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
            expect(onPointerMove).toHaveBeenCalledOnce();

            grid.element().dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
            expect(onPointerUp).toHaveBeenCalledOnce();
        });

        it('handles pointer event cancellation during interaction', async () => {
            const onPointerDown = vi.fn();
            const onPointerMove = vi.fn();
            const onPointerCancel = vi.fn();
            const onPointerUp = vi.fn();
            const { getByRole } = await renderGameBoard({
                onPointerDown,
                onPointerMove,
                onPointerCancel,
                onPointerUp,
            });

            const grid = getByRole('grid');

            grid.element().dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
            expect(onPointerDown).toHaveBeenCalledOnce();

            grid.element().dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
            expect(onPointerMove).toHaveBeenCalledOnce();

            grid.element().dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }));
            expect(onPointerCancel).toHaveBeenCalledOnce();

            // Pointer up should not have been called
            expect(onPointerUp).not.toHaveBeenCalled();
        });
    });

    describe('Ref Forwarding', () => {
        it('forwards ref to the grid div element', async () => {
            const ref = createRef<HTMLDivElement>();
            await render(<GameBoard {...defaultProps} ref={ref} />);

            expect(ref.current).not.toBeNull();
            expect(ref.current).toBeInstanceOf(HTMLDivElement);
            expect(ref.current?.getAttribute('role')).toBe('grid');
        });

        it('ref provides access to DOM methods', async () => {
            const ref = createRef<HTMLDivElement>();
            await render(<GameBoard {...defaultProps} ref={ref} />);

            expect(ref.current).not.toBeNull();
            expect(typeof ref.current?.getBoundingClientRect).toBe('function');
            expect(typeof ref.current?.focus).toBe('function');

            // Verify getBoundingClientRect works
            const rect = ref.current?.getBoundingClientRect();
            expect(rect).toBeDefined();
            expect(rect).toHaveProperty('width');
            expect(rect).toHaveProperty('height');
        });
    });

    describe('Edge Cases', () => {
        it('handles empty children gracefully', async () => {
            const { getByRole } = await renderGameBoard({ children: null });

            const grid = getByRole('grid');
            await expect.element(grid).toBeInTheDocument();
            expect(grid.element().children.length).toBe(0);
        });

        it('handles fragment children', async () => {
            const { getByTestId } = await renderGameBoard({
                children: (
                    <>
                        <div data-testid="fragment-child-1">First</div>
                        <div data-testid="fragment-child-2">Second</div>
                        <div data-testid="fragment-child-3">Third</div>
                    </>
                ),
            });

            const child1 = getByTestId('fragment-child-1');
            const child2 = getByTestId('fragment-child-2');
            const child3 = getByTestId('fragment-child-3');

            await expect.element(child1).toBeInTheDocument();
            await expect.element(child2).toBeInTheDocument();
            await expect.element(child3).toBeInTheDocument();
        });

        it('different pointer handlers do not interfere with each other', async () => {
            const onPointerDown = vi.fn();
            const onPointerMove = vi.fn();
            const onPointerUp = vi.fn();
            const onPointerCancel = vi.fn();

            const { getByRole } = await renderGameBoard({
                onPointerDown,
                onPointerMove,
                onPointerUp,
                onPointerCancel,
            });

            const grid = getByRole('grid');

            // Trigger one event type
            grid.element().dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

            // Only the corresponding handler should be called
            expect(onPointerDown).toHaveBeenCalledOnce();
            expect(onPointerMove).not.toHaveBeenCalled();
            expect(onPointerUp).not.toHaveBeenCalled();
            expect(onPointerCancel).not.toHaveBeenCalled();

            // Trigger another event type
            grid.element().dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));

            // Both handlers should now have been called once each
            expect(onPointerDown).toHaveBeenCalledOnce();
            expect(onPointerMove).toHaveBeenCalledOnce();
            expect(onPointerUp).not.toHaveBeenCalled();
            expect(onPointerCancel).not.toHaveBeenCalled();
        });
    });
});
