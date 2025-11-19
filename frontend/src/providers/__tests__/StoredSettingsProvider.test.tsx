import { type ReactNode } from 'react';

import { render } from 'vitest-browser-react';

import * as windowUtilsModule from '../../utils/window';
import { DEFAULT_VOLUME } from '../SoundProvider.schema';
import StoredSettingsProvider, {
    defaultStoredSettings,
    getStoredSettings,
    LOCAL_STORAGE_KEY,
    useStoredSettings,
} from '../StoredSettingsProvider';

// Browser mode limitation: https://vitest.dev/guide/browser/#spying-on-module-exports
vi.mock('../../utils/window', { spy: true });

// Helper component to consume the context for testing
const StoredSettingsConsumer = () => {
    const { soundsEnabled, soundsVolume, setSetting } = useStoredSettings();

    return (
        <div data-testid="stored-settings-consumer">
            <span data-testid="sounds-enabled">{soundsEnabled ? 'true' : 'false'}</span>
            <span data-testid="sounds-volume">{soundsVolume}</span>
            <button data-testid="enable-sounds-button" onClick={() => setSetting('soundsEnabled', true)}>
                Enable sounds
            </button>
            <button data-testid="disable-sounds-button" onClick={() => setSetting('soundsEnabled', false)}>
                Disable sounds
            </button>
            <button data-testid="set-volume-low-button" onClick={() => setSetting('soundsVolume', 0)}>
                Set volume to 0
            </button>
            <button data-testid="set-volume-medium-button" onClick={() => setSetting('soundsVolume', DEFAULT_VOLUME)}>
                Set volume to {DEFAULT_VOLUME}
            </button>
            <button data-testid="set-volume-high-button" onClick={() => setSetting('soundsVolume', 1)}>
                Set volume to 1
            </button>
        </div>
    );
};

type RenderStoredSettingsProviderOptions = {
    children?: ReactNode;
};

function renderStoredSettingsProvider({
    children = <StoredSettingsConsumer />,
}: RenderStoredSettingsProviderOptions = {}) {
    return render(<StoredSettingsProvider>{children}</StoredSettingsProvider>);
}

describe('StoredSettingsProvider', () => {
    it('provides initial stored settings to consumers', async () => {
        const mockSettings = {
            soundsEnabled: false,
            soundsVolume: 0.75,
        };
        vi.spyOn(windowUtilsModule, 'getStoredValue').mockReturnValue(mockSettings);

        const { getByTestId } = await renderStoredSettingsProvider();

        const soundsEnabledElement = getByTestId('sounds-enabled');
        const soundsVolumeElement = getByTestId('sounds-volume');

        await expect.element(soundsEnabledElement).toHaveTextContent('false');
        await expect.element(soundsVolumeElement).toHaveTextContent('0.75');
    });

    it('updates soundsEnabled and persists changes when setSetting is called', async () => {
        vi.spyOn(windowUtilsModule, 'getStoredValue').mockReturnValue(defaultStoredSettings);
        const setStoredValueSpy = vi.spyOn(windowUtilsModule, 'setStoredValue');

        const { getByTestId } = await renderStoredSettingsProvider();

        const soundsEnabledElement = getByTestId('sounds-enabled');
        const disableButton = getByTestId('disable-sounds-button');
        const enableButton = getByTestId('enable-sounds-button');

        await expect.element(soundsEnabledElement).toHaveTextContent('true');

        await disableButton.click();

        await expect.element(soundsEnabledElement).toHaveTextContent('false');
        expect(setStoredValueSpy).toHaveBeenCalledWith('localStorage', LOCAL_STORAGE_KEY, {
            soundsEnabled: false,
            soundsVolume: DEFAULT_VOLUME,
        });

        await enableButton.click();

        await expect.element(soundsEnabledElement).toHaveTextContent('true');
        expect(setStoredValueSpy).toHaveBeenCalledWith('localStorage', LOCAL_STORAGE_KEY, {
            soundsEnabled: true,
            soundsVolume: DEFAULT_VOLUME,
        });
    });

    it('updates soundsVolume and persists changes when setSetting is called', async () => {
        vi.spyOn(windowUtilsModule, 'getStoredValue').mockReturnValue(defaultStoredSettings);
        const setStoredValueSpy = vi.spyOn(windowUtilsModule, 'setStoredValue');

        const { getByTestId } = await renderStoredSettingsProvider();

        const soundsVolumeElement = getByTestId('sounds-volume');
        const setVolumeLowButton = getByTestId('set-volume-low-button');
        const setVolumeMediumButton = getByTestId('set-volume-medium-button');
        const setVolumeHighButton = getByTestId('set-volume-high-button');

        await expect.element(soundsVolumeElement).toHaveTextContent(String(DEFAULT_VOLUME));

        await setVolumeLowButton.click();

        await expect.element(soundsVolumeElement).toHaveTextContent('0');
        expect(setStoredValueSpy).toHaveBeenCalledWith('localStorage', LOCAL_STORAGE_KEY, {
            soundsEnabled: true,
            soundsVolume: 0,
        });

        await setVolumeHighButton.click();

        await expect.element(soundsVolumeElement).toHaveTextContent('1');
        expect(setStoredValueSpy).toHaveBeenCalledWith('localStorage', LOCAL_STORAGE_KEY, {
            soundsEnabled: true,
            soundsVolume: 1,
        });

        await setVolumeMediumButton.click();

        await expect.element(soundsVolumeElement).toHaveTextContent(String(DEFAULT_VOLUME));
        expect(setStoredValueSpy).toHaveBeenCalledWith('localStorage', LOCAL_STORAGE_KEY, {
            soundsEnabled: true,
            soundsVolume: DEFAULT_VOLUME,
        });
    });

    it('does not accept invalid setting values that fail schema validation', async () => {
        vi.spyOn(windowUtilsModule, 'getStoredValue').mockReturnValue(defaultStoredSettings);
        const setStoredValueSpy = vi.spyOn(windowUtilsModule, 'setStoredValue');

        // Create a component that tries to set invalid values
        const InvalidValueTester = () => {
            const { soundsEnabled, soundsVolume, setSetting } = useStoredSettings();

            return (
                <div data-testid="invalid-value-tester">
                    <span data-testid="sounds-enabled">{soundsEnabled ? 'true' : 'false'}</span>
                    <span data-testid="sounds-volume">{soundsVolume}</span>
                    <button data-testid="set-invalid-high-volume" onClick={() => setSetting('soundsVolume', 1.5)}>
                        Set invalid high volume
                    </button>
                    <button data-testid="set-invalid-low-volume" onClick={() => setSetting('soundsVolume', -0.5)}>
                        Set invalid low volume
                    </button>
                </div>
            );
        };

        const { getByTestId } = await renderStoredSettingsProvider({
            children: <InvalidValueTester />,
        });

        const setInvalidHighVolumeButton = getByTestId('set-invalid-high-volume');
        const setInvalidLowVolumeButton = getByTestId('set-invalid-low-volume');

        await setInvalidHighVolumeButton.click();
        await setInvalidLowVolumeButton.click();

        expect(setStoredValueSpy).not.toHaveBeenCalled();

        // Verify the values remain unchanged
        const soundsEnabledElement = getByTestId('sounds-enabled');
        const soundsVolumeElement = getByTestId('sounds-volume');
        await expect.element(soundsEnabledElement).toHaveTextContent('true');
        await expect.element(soundsVolumeElement).toHaveTextContent(String(DEFAULT_VOLUME));
    });
});

describe('useStoredSettings', () => {
    it('returns stored settings context values when used within StoredSettingsProvider', async () => {
        const mockSettings = {
            soundsEnabled: false,
            soundsVolume: 0.8,
        };
        vi.spyOn(windowUtilsModule, 'getStoredValue').mockReturnValue(mockSettings);

        const { getByTestId } = await renderStoredSettingsProvider();

        const soundsEnabledElement = getByTestId('sounds-enabled');
        const soundsVolumeElement = getByTestId('sounds-volume');

        await expect.element(soundsEnabledElement).toHaveTextContent('false');
        await expect.element(soundsVolumeElement).toHaveTextContent('0.8');
    });

    it('throws an error when used outside of StoredSettingsProvider', async () => {
        const ComponentUsingHook = () => {
            useStoredSettings();
            return <div>Test</div>;
        };

        await expect(async () => await render(<ComponentUsingHook />)).rejects.toThrow(
            'useStoredSettings must be used within a StoredSettingsProvider'
        );
    });
});

describe('getStoredSettings', () => {
    it('returns default settings when reading from local storage fails', () => {
        const getStoredValueSpy = vi.spyOn(windowUtilsModule, 'getStoredValue').mockImplementation(() => {
            throw new Error('LocalStorage access failed');
        });
        const setStoredValueSpy = vi.spyOn(windowUtilsModule, 'setStoredValue');

        const result = getStoredSettings();

        expect(getStoredValueSpy).toHaveBeenCalledWith('localStorage', LOCAL_STORAGE_KEY);
        expect(setStoredValueSpy).toHaveBeenCalledWith('localStorage', LOCAL_STORAGE_KEY, defaultStoredSettings);
        expect(result).toEqual(defaultStoredSettings);
    });

    it('returns default settings when no settings are stored', () => {
        const getStoredValueSpy = vi.spyOn(windowUtilsModule, 'getStoredValue').mockReturnValue(null);
        const setStoredValueSpy = vi.spyOn(windowUtilsModule, 'setStoredValue');

        const result = getStoredSettings();

        expect(getStoredValueSpy).toHaveBeenCalledWith('localStorage', LOCAL_STORAGE_KEY);
        expect(setStoredValueSpy).toHaveBeenCalledWith('localStorage', LOCAL_STORAGE_KEY, defaultStoredSettings);
        expect(result).toEqual(defaultStoredSettings);
    });

    it('returns default settings when stored settings are invalid', () => {
        const invalidSettings = {
            soundsEnabled: 'not-a-boolean',
            soundsVolume: 2.5,
        };
        const getStoredValueSpy = vi.spyOn(windowUtilsModule, 'getStoredValue').mockReturnValue(invalidSettings);
        const setStoredValueSpy = vi.spyOn(windowUtilsModule, 'setStoredValue');

        const result = getStoredSettings();

        expect(getStoredValueSpy).toHaveBeenCalledWith('localStorage', LOCAL_STORAGE_KEY);
        expect(setStoredValueSpy).toHaveBeenCalledWith('localStorage', LOCAL_STORAGE_KEY, defaultStoredSettings);
        expect(result).toEqual(defaultStoredSettings);
    });

    it('returns stored settings when stored settings are valid', () => {
        const validSettings = {
            soundsEnabled: false,
            soundsVolume: 0.75,
        };
        const getStoredValueSpy = vi.spyOn(windowUtilsModule, 'getStoredValue').mockReturnValue(validSettings);
        const setStoredValueSpy = vi.spyOn(windowUtilsModule, 'setStoredValue');

        const result = getStoredSettings();

        expect(getStoredValueSpy).toHaveBeenCalledWith('localStorage', LOCAL_STORAGE_KEY);
        expect(setStoredValueSpy).not.toHaveBeenCalled();
        expect(result).toEqual(validSettings);
    });
});
