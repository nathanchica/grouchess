import { getStoredValue } from './window';

import type { AudioPoolMap, SoundName, StoredSettings } from '../providers/SoundProvider.schema';
import {
    DEFAULT_VOLUME,
    LOCAL_STORAGE_KEY,
    POOL_SIZE,
    SOUND_FILE_MAP,
    StoredSettingsSchema,
} from '../providers/SoundProvider.schema';

export const clampVolume = (value: number): number => {
    if (Number.isNaN(value)) return DEFAULT_VOLUME;
    return Math.min(1, Math.max(0, value));
};

export const readStoredSettings = (): StoredSettings | null => {
    const rawValue = getStoredValue('localStorage', LOCAL_STORAGE_KEY, null);
    if (rawValue === null) return null;

    const result = StoredSettingsSchema.safeParse(rawValue);
    if (!result.success) return null;

    const { enabled, volume } = result.data;

    return {
        enabled,
        volume: clampVolume(volume),
    };
};

export const createAudioElement = (src: string): HTMLAudioElement => {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    return audio;
};

export const buildInitialPools = (): AudioPoolMap => {
    if (typeof window === 'undefined') {
        return {};
    }

    const entries = Object.entries(SOUND_FILE_MAP) as [SoundName, string][];
    return entries.reduce<AudioPoolMap>((acc, [soundName, src]) => {
        const elements = Array.from({ length: POOL_SIZE }, () => createAudioElement(src));
        acc[soundName] = { elements, src };
        return acc;
    }, {});
};
