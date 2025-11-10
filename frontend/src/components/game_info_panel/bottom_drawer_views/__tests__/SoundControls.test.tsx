import { render } from 'vitest-browser-react';

import { SoundContext } from '../../../../providers/SoundProvider';
import { createMockSoundContextValues } from '../../../../providers/__mocks__/SoundProvider';
import SoundControls from '../SoundControls';

describe('SoundControls', () => {
    const renderSoundControls = (contextOverrides = {}) => {
        const contextValue = createMockSoundContextValues(contextOverrides);
        return render(
            <SoundContext.Provider value={contextValue}>
                <SoundControls />
            </SoundContext.Provider>
        );
    };

    describe('Component Rendering and Initial State', () => {
        it('renders sound controls section with proper semantic structure', async () => {
            const { getByLabelText, getByRole, getByText } = await renderSoundControls();

            await expect.element(getByText('Sound Effects')).toBeInTheDocument();
            await expect.element(getByLabelText('Sound effect volume')).toBeInTheDocument();
            await expect.element(getByRole('button', { name: /toggle sound effects/i })).toBeInTheDocument();
            await expect.element(getByRole('slider', { name: /sound effect volume/i })).toBeInTheDocument();
        });

        it('displays correct state when sound is enabled', async () => {
            const { getByRole } = await renderSoundControls({ enabled: true, volume: 0.7 });

            const toggleButton = getByRole('button', { name: /toggle sound effects/i });
            await expect.element(toggleButton).toHaveTextContent('On');
            await expect.element(toggleButton).toHaveAttribute('aria-pressed', 'true');

            const volumeSlider = getByRole('slider', { name: /sound effect volume/i });
            await expect.element(volumeSlider).toHaveValue('70');
            await expect.element(volumeSlider).toHaveAttribute('aria-valuetext', '70%');
            await expect.element(volumeSlider).not.toBeDisabled();
        });

        it('displays correct state when sound is disabled', async () => {
            const { getByRole } = await renderSoundControls({ enabled: false, volume: 0.5 });

            const toggleButton = getByRole('button', { name: /toggle sound effects/i });
            await expect.element(toggleButton).toHaveTextContent('Off');
            await expect.element(toggleButton).toHaveAttribute('aria-pressed', 'false');

            const volumeSlider = getByRole('slider', { name: /sound effect volume/i });
            await expect.element(volumeSlider).toHaveValue('50');
            await expect.element(volumeSlider).toHaveAttribute('aria-valuetext', 'Muted');
            await expect.element(volumeSlider).toBeDisabled();
        });
    });

    describe('Toggle Button Interactions', () => {
        it.each([
            { initialEnabled: true, buttonText: 'On' },
            { initialEnabled: false, buttonText: 'Off' },
        ])('calls toggleEnabled when clicking $buttonText button', async ({ initialEnabled }) => {
            const toggleEnabled = vi.fn();
            const { getByRole } = await renderSoundControls({ enabled: initialEnabled, toggleEnabled });

            const toggleButton = getByRole('button', { name: /toggle sound effects/i });
            expect(toggleButton).toHaveAttribute('aria-pressed', String(initialEnabled));
            await toggleButton.click();

            expect(toggleEnabled).toHaveBeenCalledTimes(1);
        });
    });

    describe('Volume Slider Interactions', () => {
        it('adjusts volume when slider is moved while sound is enabled', async () => {
            const setVolume = vi.fn();
            const { getByRole } = await renderSoundControls({ enabled: true, volume: 0.5, setVolume });

            const volumeSlider = getByRole('slider', { name: /sound effect volume/i });
            expect(volumeSlider).not.toBeDisabled();

            await volumeSlider.fill('80');
            expect(setVolume).toHaveBeenCalledWith(0.8);
        });
    });

    describe('Volume Display and Rounding', () => {
        it.each([
            { volume: 0.333, expectedDisplay: 33 },
            { volume: 0.666, expectedDisplay: 67 },
            { volume: 0.999, expectedDisplay: 100 },
            { volume: 0, expectedDisplay: 0 },
            { volume: 1, expectedDisplay: 100 },
        ])('rounds volume $volume to $expectedDisplay%', async ({ volume, expectedDisplay }) => {
            const { getByRole } = await renderSoundControls({ enabled: true, volume });

            const volumeSlider = getByRole('slider', { name: /sound effect volume/i });
            await expect.element(volumeSlider).toHaveValue(String(expectedDisplay));
            await expect.element(volumeSlider).toHaveAttribute('aria-valuetext', `${expectedDisplay}%`);
        });
    });

    describe('Accessibility Features', () => {
        it('updates aria-valuetext to "Muted" when sound is disabled', async () => {
            const { getByRole } = await renderSoundControls({ enabled: false, volume: 0.5 });

            const volumeSlider = getByRole('slider', { name: /sound effect volume/i });
            await expect.element(volumeSlider).toHaveAttribute('aria-valuetext', 'Muted');
        });
    });

    describe('Visual State Management', () => {
        it('renders toggle button with correct text for enabled state', async () => {
            const { getByRole } = await renderSoundControls({ enabled: true });

            const toggleButton = getByRole('button', { name: /toggle sound effects/i });
            await expect.element(toggleButton).toHaveTextContent('On');
        });

        it('renders toggle button with correct text for disabled state', async () => {
            const { getByRole } = await renderSoundControls({ enabled: false });

            const toggleButton = getByRole('button', { name: /toggle sound effects/i });
            await expect.element(toggleButton).toHaveTextContent('Off');
        });

        it('slider is not disabled when sound is enabled', async () => {
            const { getByRole } = await renderSoundControls({ enabled: true });

            const volumeSlider = getByRole('slider', { name: /sound effect volume/i });
            await expect.element(volumeSlider).not.toBeDisabled();
        });

        it('slider is disabled when sound is disabled', async () => {
            const { getByRole } = await renderSoundControls({ enabled: false });

            const volumeSlider = getByRole('slider', { name: /sound effect volume/i });
            await expect.element(volumeSlider).toBeDisabled();
        });
    });
});
