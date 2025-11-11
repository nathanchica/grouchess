import { render } from 'vitest-browser-react';

import PlayerSettingsView from '../PlayerSettingsView';

vi.mock('../SoundControls', () => {
    return {
        default: function MockSoundControls() {
            return <div>Mock SoundControls</div>;
        },
    };
});

describe('PlayerSettingsView', () => {
    it('renders SoundControls component', async () => {
        const { getByText } = await render(<PlayerSettingsView />);
        await expect.element(getByText('Mock SoundControls')).toBeDefined();
    });
});
