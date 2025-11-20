import { render } from 'vitest-browser-react';

import PlayerSettingsView from '../PlayerSettingsView';

vi.mock('../SoundControls', () => {
    return {
        default: function MockSoundControls() {
            return <div>Mock SoundControls</div>;
        },
    };
});

vi.mock('../MoveNotationControls', () => {
    return {
        default: function MockMoveNotationControls() {
            return <div>Mock MoveNotationControls</div>;
        },
    };
});

describe('PlayerSettingsView', () => {
    it('renders settings components', async () => {
        const { getByText } = await render(<PlayerSettingsView />);
        await expect.element(getByText('Mock SoundControls')).toBeInTheDocument();
        await expect.element(getByText('Mock MoveNotationControls')).toBeInTheDocument();
    });
});
