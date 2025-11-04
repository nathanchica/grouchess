import { createMockChessGameMessage } from '@grouchess/test-utils';
import { render } from 'vitest-browser-react';

import ChatMessage from '../ChatMessage';

describe('ChatMessage', () => {
    it('renders correctly', async () => {
        const message = createMockChessGameMessage({ content: 'Hello, world!' });
        const playerId = message.authorId;
        const mockOnDrawAccept = vi.fn();
        const mockOnDrawDecline = vi.fn();
        const mockOnRematchAccept = vi.fn();
        const mockOnRematchDecline = vi.fn();
        const props = {
            message,
            currentPlayerId: playerId,
            onDrawAccept: mockOnDrawAccept,
            onDrawDecline: mockOnDrawDecline,
            onRematchAccept: mockOnRematchAccept,
            onRematchDecline: mockOnRematchDecline,
        };

        const screen = await render(<ChatMessage {...props} />);
        expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    });
});
