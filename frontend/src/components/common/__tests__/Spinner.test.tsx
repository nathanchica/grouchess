import { render } from 'vitest-browser-react';

import Spinner from '../Spinner';

describe('Spinner', () => {
    it.each([
        { variant: 'light' as const, size: 'sm' as const },
        { variant: 'light' as const, size: 'md' as const },
        { variant: 'light' as const, size: 'lg' as const },
        { variant: 'dark' as const, size: 'sm' as const },
        { variant: 'dark' as const, size: 'md' as const },
        { variant: 'dark' as const, size: 'lg' as const },
        { variant: undefined, size: 'lg' as const },
        { variant: 'light' as const, size: undefined },
    ])('renders correctly with variant=$variant and size=$size', async ({ variant, size }) => {
        const { getByRole } = await render(
            <div role="status">
                <Spinner variant={variant} size={size} />
            </div>
        );
        await expect.element(getByRole('status')).toBeInTheDocument();
    });

    it('is decorative (aria-hidden)', async () => {
        const { container } = await render(<Spinner />);
        const svg = container.querySelector('svg');
        expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
});
