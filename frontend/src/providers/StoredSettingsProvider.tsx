import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import invariant from 'tiny-invariant';
import * as z from 'zod';

import { DEFAULT_VOLUME } from './SoundProvider.schema';

import { getStoredValue, setStoredValue } from '../utils/window';

export const LOCAL_STORAGE_KEY = 'grouchess:settings';

export const StoredSettingsSchema = z.object({
    soundsEnabled: z.boolean(),
    soundsVolume: z.number().min(0).max(1),
});

export type StoredSettings = {
    soundsEnabled: boolean;
    soundsVolume: number;
};

export type StoredSettingsContextType = {
    soundsEnabled: boolean;
    soundsVolume: number;
    setSetting: <K extends keyof StoredSettings>(key: K, value: StoredSettings[K]) => void;
};

export const StoredSettingsContext = createContext<StoredSettingsContextType | null>(null);

export function useStoredSettings(): StoredSettingsContextType {
    const context = useContext(StoredSettingsContext);
    invariant(context, 'useStoredSettings must be used within a StoredSettingsProvider');
    return context;
}

export const defaultStoredSettings: StoredSettings = {
    soundsEnabled: true,
    soundsVolume: DEFAULT_VOLUME,
};

function updateStoredSettings(newSettings: StoredSettings): void {
    try {
        setStoredValue('localStorage', LOCAL_STORAGE_KEY, newSettings);
    } catch {
        // Swallow errors (e.g., QuotaExceededError, SecurityError in private browsing)
    }
}

export function getStoredSettings(): StoredSettings {
    let rawValue: unknown;
    try {
        rawValue = getStoredValue('localStorage', LOCAL_STORAGE_KEY);
    } catch {
        rawValue = null;
    }

    if (!rawValue) {
        updateStoredSettings(defaultStoredSettings);
        return defaultStoredSettings;
    }

    const parsed = StoredSettingsSchema.safeParse(rawValue);
    if (!parsed.success) {
        updateStoredSettings(defaultStoredSettings);
        return defaultStoredSettings;
    }

    return parsed.data;
}

export type StoredSettingsProviderProps = {
    children: ReactNode;
};

/**
 * Provider component for stored settings context.
 */
function StoredSettingsProvider({ children }: StoredSettingsProviderProps) {
    const [storedSettings, setStoredSettings] = useState<StoredSettings>(() => getStoredSettings());

    const setSetting = useCallback(<K extends keyof StoredSettings>(key: K, value: StoredSettings[K]) => {
        setStoredSettings((prevSettings) => {
            const parsed = StoredSettingsSchema.safeParse({ ...prevSettings, [key]: value });
            if (!parsed.success) {
                // Invalid value, return previous settings unchanged
                return prevSettings;
            }
            const newSettings = parsed.data;
            updateStoredSettings(newSettings);
            return newSettings;
        });
    }, []);

    const contextValue: StoredSettingsContextType = useMemo(
        () => ({
            ...storedSettings,
            setSetting,
        }),
        [storedSettings, setSetting]
    );

    return <StoredSettingsContext.Provider value={contextValue}>{children}</StoredSettingsContext.Provider>;
}

export default StoredSettingsProvider;
