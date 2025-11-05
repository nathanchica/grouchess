import type { SoundContextValue } from '../SoundProvider';

export function createMockSoundContextValues(overrides?: Partial<SoundContextValue>): SoundContextValue {
    return {
        play: () => {},
        enabled: true,
        setEnabled: () => {},
        toggleEnabled: () => {},
        volume: 0.7,
        setVolume: () => {},
        ...overrides,
    };
}
