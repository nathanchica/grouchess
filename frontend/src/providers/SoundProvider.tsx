import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { DEFAULT_VOLUME, LOCAL_STORAGE_KEY, POOL_SIZE, SOUND_FILE_MAP } from './SoundProvider.schema';
import type { AudioPoolMap, PlayOptions, SoundName, StoredSettings } from './SoundProvider.schema';

import { readStoredSettings, buildInitialPools, clampVolume, createAudioElement } from '../utils/sounds';
import { setStoredValue } from '../utils/window';

export type SoundContextValue = {
    play: (sound: SoundName, options?: PlayOptions) => void;
    enabled: boolean;
    setEnabled: (nextEnabled: boolean) => void;
    toggleEnabled: () => void;
    volume: number;
    setVolume: (nextVolume: number) => void;
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
    if (Object.keys(poolsRef.current).length === 0) {
        poolsRef.current = buildInitialPools();
    }

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
            if (!enabled || typeof window === 'undefined') return;
            const pools = poolsRef.current;
            const pool = (pools[sound] ??= {
                src: SOUND_FILE_MAP[sound],
                elements: Array.from({ length: POOL_SIZE }, () => createAudioElement(SOUND_FILE_MAP[sound])),
            });

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
