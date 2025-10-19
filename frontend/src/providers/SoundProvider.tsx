import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type SoundName = 'move' | 'capture' | 'castle' | 'promote' | 'check' | 'victory' | 'defeat' | 'draw';

type PlayOptions = {
    playbackRate?: number;
};

type SoundContextValue = {
    play: (sound: SoundName, options?: PlayOptions) => void;
    enabled: boolean;
    setEnabled: (nextEnabled: boolean) => void;
    toggleEnabled: () => void;
    volume: number;
    setVolume: (nextVolume: number) => void;
};

type AudioPool = {
    elements: HTMLAudioElement[];
    src: string;
};

type AudioPoolMap = Partial<Record<SoundName, AudioPool>>;

type StoredSettings = {
    enabled: boolean;
    volume: number;
};

const SOUND_FILE_MAP: Record<SoundName, string> = {
    move: '/sounds/lisp/Move.mp3',
    capture: '/sounds/lisp/Capture.mp3',
    castle: '/sounds/lisp/Castles.mp3',
    promote: '/sounds/lisp/Move.mp3',
    check: '/sounds/lisp/Check.mp3',
    victory: '/sounds/lisp/Victory.mp3',
    defeat: '/sounds/lisp/Defeat.mp3',
    draw: '/sounds/lisp/Draw.mp3',
};

const DEFAULT_VOLUME = 0.7;
const POOL_SIZE = 3;
const LOCAL_STORAGE_KEY = 'grouchess:sound-settings';

const clampVolume = (value: number): number => {
    if (Number.isNaN(value)) return DEFAULT_VOLUME;
    return Math.min(1, Math.max(0, value));
};

const readStoredSettings = (): StoredSettings | null => {
    if (typeof window === 'undefined') return null;
    try {
        const storedValue = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!storedValue) return null;
        const parsed = JSON.parse(storedValue) as Partial<StoredSettings>;
        if (typeof parsed.enabled !== 'boolean' || typeof parsed.volume !== 'number') {
            return null;
        }
        return {
            enabled: parsed.enabled,
            volume: clampVolume(parsed.volume),
        };
    } catch {
        return null;
    }
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

const SoundContext = createContext<SoundContextValue | null>(null);

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
        if (typeof window === 'undefined') return;
        const settings: StoredSettings = {
            enabled,
            volume: volumeState,
        };
        try {
            window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
        } catch {
            // Ignore storage write errors (e.g., quota exceeded or disabled storage).
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
