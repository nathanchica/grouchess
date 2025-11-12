import { render } from 'vitest-browser-react';

import CaptureOverlay from '../CaptureOverlay';

describe('CaptureOverlay', () => {
    it.each([
        { scenario: 'dark square', isDarkSquare: true },
        { scenario: 'light square', isDarkSquare: false },
    ])('renders for $scenario', async ({ isDarkSquare }) => {
        const { getByTestId } = await render(<CaptureOverlay isDarkSquare={isDarkSquare} />);
        const overlay = getByTestId('capture-overlay');
        expect(overlay).toBeInTheDocument();
    });
});
