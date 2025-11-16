import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import {
    DEFAULT_VOLUME,
    LOCAL_STORAGE_KEY,
    POOL_SIZE,
    SOUND_FILE_MAP,
    StoredSettingsSchema,
} from './SoundProvider.schema';
import type { AudioPoolMap, PlayOptions, SoundName, StoredSettings } from './SoundProvider.schema';

import { getStoredValue, setStoredValue } from '../utils/window';

export type SoundContextValue = {
    play: (sound: SoundName, options?: PlayOptions) => void;
    enabled: boolean;
    setEnabled: (nextEnabled: boolean) => void;
    toggleEnabled: () => void;
    volume: number;
    setVolume: (nextVolume: number) => void;
};

const clampVolume = (value: number): number => {
    if (Number.isNaN(value)) return DEFAULT_VOLUME;
    return Math.min(1, Math.max(0, value));
};

const readStoredSettings = (): StoredSettings | null => {
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

const createAudioElement = (src: string): HTMLAudioElement => {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    return audio;
};

const buildInitialPools = (): AudioPoolMap => {
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

export const SoundContext = createContext<SoundContextValue | null>(null);

export function useSound(): SoundContextValue {
    const context = useContext(SoundContext);
    if (!context) {
        throw new Error('useSound must be used within a SoundProvider');
    }
    return context;
}

type Props = {
    children: ReactNode;
};

function SoundProvider({ children }: Props) {
    const storedSettings = useMemo(() => readStoredSettings(), []);
    const [enabled, setEnabled] = useState<boolean>(storedSettings?.enabled ?? true);
    const [volumeState, setVolumeState] = useState<number>(storedSettings?.volume ?? DEFAULT_VOLUME);
    const poolsRef = useRef<AudioPoolMap>({});

    useEffect(() => {
        if (Object.keys(poolsRef.current).length === 0) {
            poolsRef.current = buildInitialPools();
        }
    }, []);

    useEffect(() => {
        const settings: StoredSettings = {
            enabled,
            volume: volumeState,
        };
        try {
            setStoredValue('localStorage', LOCAL_STORAGE_KEY, settings);
        } catch {
            // Swallow errors (e.g., QuotaExceededError, SecurityError in private browsing)
        }
    }, [enabled, volumeState]);

    const setVolume = useCallback((nextVolume: number) => {
        setVolumeState(clampVolume(nextVolume));
    }, []);

    const toggleEnabled = useCallback(() => {
        setEnabled((prev) => !prev);
    }, []);

    const play = useCallback(
        (sound: SoundName, options?: PlayOptions) => {
            if (!enabled) return;
            const pools = poolsRef.current;
            if (!pools[sound]) {
                if (typeof window === 'undefined') return;
                pools[sound] = {
                    src: SOUND_FILE_MAP[sound],
                    elements: Array.from({ length: POOL_SIZE }, () => createAudioElement(SOUND_FILE_MAP[sound])),
                };
            }

            const pool = pools[sound];
            if (!pool) return;

            let audio = pool.elements.find((element) => element.paused || element.ended);
            if (!audio) {
                audio = createAudioElement(pool.src);
                pool.elements.push(audio);
            }

            audio.currentTime = 0;
            audio.volume = volumeState;
            audio.playbackRate = options?.playbackRate ?? 1;
            void audio.play().catch(() => {
                // Autoplay restrictions or other playback issues; ignored on purpose.
            });
        },
        [enabled, volumeState]
    );

    const contextValue = useMemo<SoundContextValue>(
        () => ({
            play,
            enabled,
            setEnabled,
            toggleEnabled,
            volume: volumeState,
            setVolume,
        }),
        [enabled, play, setVolume, toggleEnabled, volumeState]
    );

    return <SoundContext.Provider value={contextValue}>{children}</SoundContext.Provider>;
}

export default SoundProvider;
