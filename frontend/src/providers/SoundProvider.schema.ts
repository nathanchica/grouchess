import * as z from 'zod';

export type SoundName = 'move' | 'capture' | 'castle' | 'promote' | 'check' | 'victory' | 'defeat' | 'draw';

export type PlayOptions = {
    playbackRate?: number;
};

export type AudioPool = {
    elements: HTMLAudioElement[];
    src: string;
};

export type AudioPoolMap = Partial<Record<SoundName, AudioPool>>;

export const StoredSettingsSchema = z.object({
    enabled: z.boolean(),
    volume: z.number(),
});
export type StoredSettings = z.infer<typeof StoredSettingsSchema>;

export const SOUND_FILE_MAP: Record<SoundName, string> = {
    move: '/sounds/lisp/Move.mp3',
    capture: '/sounds/lisp/Capture.mp3',
    castle: '/sounds/lisp/Castles.mp3',
    promote: '/sounds/lisp/Move.mp3',
    check: '/sounds/lisp/Check.mp3',
    victory: '/sounds/lisp/Victory.mp3',
    defeat: '/sounds/lisp/Defeat.mp3',
    draw: '/sounds/lisp/Draw.mp3',
};

export const DEFAULT_VOLUME = 0.7;
export const POOL_SIZE = 3;
export const LOCAL_STORAGE_KEY = 'grouchess:sound-settings';
