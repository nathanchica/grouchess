import { DEFAULT_VOLUME, POOL_SIZE, SOUND_FILE_MAP } from '../../providers/SoundProvider.schema';
import type { SoundName } from '../../providers/SoundProvider.schema';
import { clampVolume, createAudioElement, buildInitialPools } from '../sounds';

vi.mock('../window', { spy: true });

describe('clampVolume', () => {
    it.each([
        { scenario: 'returns value when within valid range (0-1)', input: 0.5, expected: 0.5 },
        { scenario: 'returns 0 when input is 0', input: 0, expected: 0 },
        { scenario: 'returns 1 when input is 1', input: 1, expected: 1 },
        { scenario: 'clamps to 0 when input is negative', input: -0.5, expected: 0 },
        { scenario: 'clamps to 1 when input exceeds 1', input: 1.5, expected: 1 },
        { scenario: 'clamps to 1 when input is very large', input: 999, expected: 1 },
        { scenario: 'clamps to 0 when input is very small', input: -999, expected: 0 },
        { scenario: 'returns DEFAULT_VOLUME when input is NaN', input: NaN, expected: DEFAULT_VOLUME },
    ])('$scenario', ({ input, expected }) => {
        const result = clampVolume(input);
        expect(result).toBe(expected);
    });
});

describe('createAudioElement', () => {
    it('creates audio element with correct properties', () => {
        const src = '/sounds/test.mp3';
        const audio = createAudioElement(src);

        expect(audio).toBeInstanceOf(Audio);
        expect(audio.src).toContain(src);
        expect(audio.preload).toBe('auto');
        expect(audio.crossOrigin).toBe('anonymous');
    });

    it('creates independent audio elements for different sources', () => {
        const audio1 = createAudioElement('/sounds/sound1.mp3');
        const audio2 = createAudioElement('/sounds/sound2.mp3');

        expect(audio1).not.toBe(audio2);
        expect(audio1.src).toContain('sound1.mp3');
        expect(audio2.src).toContain('sound2.mp3');
    });
});

describe('buildInitialPools', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('returns empty object when window is undefined', () => {
        // Mock window as undefined
        const originalWindow = global.window;
        // @ts-expect-error - deliberately setting window to undefined for testing
        delete global.window;

        const pools = buildInitialPools();

        expect(pools).toEqual({});

        // Restore window
        global.window = originalWindow;
    });

    it('creates pools for all sound names when window exists', () => {
        const pools = buildInitialPools();

        const soundNames: SoundName[] = ['move', 'capture', 'castle', 'promote', 'check', 'victory', 'defeat', 'draw'];

        soundNames.forEach((soundName) => {
            expect(pools[soundName]).toBeDefined();
        });
    });

    it('creates correct number of audio elements per pool', () => {
        const pools = buildInitialPools();

        Object.values(pools).forEach((pool) => {
            expect(pool?.elements).toHaveLength(POOL_SIZE);
        });
    });

    it('creates audio elements with correct properties for each pool', () => {
        const pools = buildInitialPools();

        Object.entries(pools).forEach(([soundName, pool]) => {
            const expectedSrc = SOUND_FILE_MAP[soundName as SoundName];

            pool?.elements.forEach((audio) => {
                expect(audio).toBeInstanceOf(Audio);
                expect(audio.src).toContain(expectedSrc);
                expect(audio.preload).toBe('auto');
                expect(audio.crossOrigin).toBe('anonymous');
            });
        });
    });

    it('creates independent audio elements within each pool', () => {
        const pools = buildInitialPools();

        Object.values(pools).forEach((pool) => {
            const elements = pool?.elements ?? [];
            const uniqueElements = new Set(elements);
            expect(uniqueElements.size).toBe(elements.length);
        });
    });
});
