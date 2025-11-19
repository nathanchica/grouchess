import type { StoredSettingsContextType } from '../StoredSettingsProvider';

export function createMockStoredSettingsContextValues(): StoredSettingsContextType {
    return {
        soundsEnabled: true,
        soundsVolume: 0.5,
        setSetting: () => {},
    };
}
