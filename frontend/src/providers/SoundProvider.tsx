import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react';

import { POOL_SIZE, SOUND_FILE_MAP } from './SoundProvider.schema';
import type { AudioPoolMap, PlayOptions, SoundName } from './SoundProvider.schema';
import { useStoredSettings } from './StoredSettingsProvider';

import { buildInitialPools, clampVolume, createAudioElement } from '../utils/sounds';

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
    const { soundsEnabled, soundsVolume, setSetting } = useStoredSettings();

    const poolsRef = useRef<AudioPoolMap>({});
    if (Object.keys(poolsRef.current).length === 0) {
        poolsRef.current = buildInitialPools();
    }

    const setVolume = useCallback(
        (nextVolume: number) => {
            setSetting('soundsVolume', clampVolume(nextVolume));
        },
        [setSetting]
    );

    const toggleEnabled = useCallback(() => {
        setSetting('soundsEnabled', !soundsEnabled);
    }, [setSetting, soundsEnabled]);

    const setEnabled = useCallback(
        (nextEnabled: boolean) => {
            setSetting('soundsEnabled', nextEnabled);
        },
        [setSetting]
    );

    const play = useCallback(
        (sound: SoundName, options?: PlayOptions) => {
            if (!soundsEnabled || typeof window === 'undefined') return;
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
            audio.volume = soundsVolume;
            audio.playbackRate = options?.playbackRate ?? 1;
            void audio.play().catch(() => {
                // Autoplay restrictions or other playback issues; ignored on purpose.
            });
        },
        [soundsEnabled, soundsVolume]
    );

    const contextValue = useMemo<SoundContextValue>(
        () => ({
            play,
            enabled: soundsEnabled,
            setEnabled,
            toggleEnabled,
            volume: soundsVolume,
            setVolume,
        }),
        [soundsEnabled, setEnabled, play, setVolume, toggleEnabled, soundsVolume]
    );

    return <SoundContext.Provider value={contextValue}>{children}</SoundContext.Provider>;
}

export default SoundProvider;
