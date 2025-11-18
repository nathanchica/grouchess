import { type ReactNode } from 'react';

import { render } from 'vitest-browser-react';

import * as soundUtilsModule from '../../utils/sounds';
import * as windowUtilsModule from '../../utils/window';
import SoundProvider, { useSound } from '../SoundProvider';
import { DEFAULT_VOLUME, LOCAL_STORAGE_KEY, POOL_SIZE, SOUND_FILE_MAP, type SoundName } from '../SoundProvider.schema';

// Browser mode limitation: https://vitest.dev/guide/browser/#spying-on-module-exports
vi.mock('../../utils/window', { spy: true });
vi.mock('../../utils/sounds', { spy: true });

const defaultSoundName: SoundName = 'move';

const SoundConsumer = () => {
    const { enabled, setEnabled, toggleEnabled, volume, setVolume, play } = useSound();

    return (
        <div data-testid="sound-consumer">
            <span data-testid="enabled">{enabled ? 'true' : 'false'}</span>
            <span data-testid="volume">{volume}</span>
            <button data-testid="enable-sound-button" onClick={() => setEnabled(true)}>
                Enable sound
            </button>
            <button data-testid="disable-sound-button" onClick={() => setEnabled(false)}>
                Disable sound
            </button>
            <button data-testid="toggle-sound-button" onClick={toggleEnabled}>
                Toggle sound
            </button>
            <button data-testid="set-volume-zero-button" onClick={() => setVolume(0)}>
                Set volume to 0
            </button>
            <button data-testid="set-volume-half-button" onClick={() => setVolume(0.5)}>
                Set volume to 0.5
            </button>
            <button data-testid="set-volume-full-button" onClick={() => setVolume(1)}>
                Set volume to 1
            </button>
            <button data-testid="play-default-sound-button" onClick={() => play(defaultSoundName)}>
                Play default sound
            </button>
            <button data-testid="play-with-options-button" onClick={() => play('capture', { playbackRate: 2 })}>
                Play with options
            </button>
        </div>
    );
};

type RenderSoundProviderOptions = {
    children?: ReactNode;
};

function renderSoundProvider({ children = <SoundConsumer /> }: RenderSoundProviderOptions = {}) {
    return render(<SoundProvider>{children}</SoundProvider>);
}

describe('SoundProvider', () => {
    type MockAudioElement = {
        play: ReturnType<typeof vi.fn>;
        pause: ReturnType<typeof vi.fn>;
        load: ReturnType<typeof vi.fn>;
        currentTime: number;
        volume: number;
        playbackRate: number;
        paused: boolean;
        ended: boolean;
        crossOrigin: string;
        preload: string;
    };

    const mockAudioInstances: MockAudioElement[] = [];

    function createMockAudioElement(): MockAudioElement {
        const element: MockAudioElement = {
            play: vi.fn().mockResolvedValue(undefined),
            pause: vi.fn(),
            load: vi.fn(),
            currentTime: 0,
            volume: 1,
            playbackRate: 1,
            paused: true,
            ended: false,
            crossOrigin: '',
            preload: '',
        };
        mockAudioInstances.push(element);
        return element;
    }

    const mockAudio = vi.fn(createMockAudioElement) as unknown as typeof Audio;

    beforeAll(() => {
        vi.stubGlobal('Audio', mockAudio);
    });

    afterAll(() => {
        vi.unstubAllGlobals();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockAudioInstances.length = 0;

        vi.spyOn(soundUtilsModule, 'readStoredSettings').mockReturnValue(null);
        vi.spyOn(soundUtilsModule, 'buildInitialPools').mockReturnValue({});
        vi.spyOn(soundUtilsModule, 'createAudioElement').mockImplementation(() =>
            (createMockAudioElement as unknown as () => HTMLAudioElement)()
        );
        vi.spyOn(soundUtilsModule, 'clampVolume').mockImplementation((value) => {
            if (Number.isNaN(value)) return DEFAULT_VOLUME;
            return Math.min(1, Math.max(0, value));
        });
    });

    describe('initialization and stored settings', () => {
        it('uses default settings when no stored settings exist', async () => {
            vi.spyOn(windowUtilsModule, 'getStoredValue').mockReturnValue(null);

            const { getByTestId } = await renderSoundProvider();

            const enabled = getByTestId('enabled');
            const volume = getByTestId('volume');

            await expect.element(enabled).toHaveTextContent('true');
            await expect.element(volume).toHaveTextContent(String(DEFAULT_VOLUME));
        });

        it('initializes from valid stored settings in localStorage', async () => {
            vi.spyOn(soundUtilsModule, 'readStoredSettings').mockReturnValue({
                enabled: false,
                volume: 0.5,
            });

            const { getByTestId } = await renderSoundProvider();

            const enabled = getByTestId('enabled');
            const volume = getByTestId('volume');

            await expect.element(enabled).toHaveTextContent('false');
            await expect.element(volume).toHaveTextContent('0.5');
        });
    });

    describe('persistence to localStorage', () => {
        it('persists enabled and volume changes to localStorage', async () => {
            vi.spyOn(windowUtilsModule, 'getStoredValue').mockReturnValue(null);
            const setStoredValueSpy = vi.spyOn(windowUtilsModule, 'setStoredValue');

            const { getByTestId } = await renderSoundProvider();

            // Initial render should persist default settings
            expect(setStoredValueSpy).toHaveBeenCalledWith('localStorage', LOCAL_STORAGE_KEY, {
                enabled: true,
                volume: DEFAULT_VOLUME,
            });

            setStoredValueSpy.mockClear();

            // Change enabled to false
            const disableButton = getByTestId('disable-sound-button');
            await disableButton.click();

            expect(setStoredValueSpy).toHaveBeenCalledWith('localStorage', LOCAL_STORAGE_KEY, {
                enabled: false,
                volume: DEFAULT_VOLUME,
            });

            setStoredValueSpy.mockClear();

            // Change volume to 0.5
            const setVolumeButton = getByTestId('set-volume-half-button');
            await setVolumeButton.click();

            expect(setStoredValueSpy).toHaveBeenCalledWith('localStorage', LOCAL_STORAGE_KEY, {
                enabled: false,
                volume: 0.5,
            });
        });

        it('swallows errors when localStorage.setItem throws', async () => {
            vi.spyOn(windowUtilsModule, 'getStoredValue').mockReturnValue(null);
            vi.spyOn(windowUtilsModule, 'setStoredValue').mockImplementation(() => {
                throw new Error('QuotaExceededError');
            });

            // Should not throw despite setStoredValue throwing
            const { getByTestId } = await renderSoundProvider();

            const enabled = getByTestId('enabled');
            const volume = getByTestId('volume');

            // Component should still render with default values
            await expect.element(enabled).toHaveTextContent('true');
            await expect.element(volume).toHaveTextContent(String(DEFAULT_VOLUME));

            // Should still be able to change state even though persistence fails
            const disableButton = getByTestId('disable-sound-button');
            await disableButton.click();

            // UI should update despite persistence error
            await expect.element(enabled).toHaveTextContent('false');
        });
    });

    describe('enabled and volume controls', () => {
        it('provides initial enabled and volume values via context', async () => {
            vi.spyOn(windowUtilsModule, 'getStoredValue').mockReturnValue(null);
            const { getByTestId } = await renderSoundProvider();

            const enabled = getByTestId('enabled');
            const volume = getByTestId('volume');

            await expect.element(enabled).toHaveTextContent('true');
            await expect.element(volume).toHaveTextContent(String(DEFAULT_VOLUME));
        });

        it('updates enabled when setEnabled is called', async () => {
            const { getByTestId } = await renderSoundProvider();

            const enabled = getByTestId('enabled');
            const disableButton = getByTestId('disable-sound-button');
            const enableButton = getByTestId('enable-sound-button');

            await expect.element(enabled).toHaveTextContent('true');

            await disableButton.click();
            await expect.element(enabled).toHaveTextContent('false');

            await enableButton.click();
            await expect.element(enabled).toHaveTextContent('true');
        });

        it('toggles enabled flag when toggleEnabled is called', async () => {
            const { getByTestId } = await renderSoundProvider();

            const enabled = getByTestId('enabled');
            const toggleButton = getByTestId('toggle-sound-button');

            await expect.element(enabled).toHaveTextContent('true');

            await toggleButton.click();
            await expect.element(enabled).toHaveTextContent('false');

            await toggleButton.click();
            await expect.element(enabled).toHaveTextContent('true');
        });
    });

    describe('audio pools and playback', () => {
        it('builds initial audio pools on first mount', async () => {
            const buildInitialPoolsSpy = vi.spyOn(soundUtilsModule, 'buildInitialPools');

            await renderSoundProvider();

            expect(buildInitialPoolsSpy).toHaveBeenCalledOnce();
        });

        it('only builds audio pools once on mount, not on rerender', async () => {
            const mockElement = createMockAudioElement();
            const buildInitialPoolsSpy = vi.spyOn(soundUtilsModule, 'buildInitialPools').mockReturnValue({
                [defaultSoundName]: {
                    elements: [mockElement as unknown as HTMLAudioElement],
                    src: SOUND_FILE_MAP[defaultSoundName],
                },
            });
            const { rerender } = await renderSoundProvider();

            expect(buildInitialPoolsSpy).toHaveBeenCalledOnce();

            buildInitialPoolsSpy.mockClear();

            await rerender(
                <SoundProvider>
                    <div>New Children</div>
                </SoundProvider>
            );

            expect(buildInitialPoolsSpy).not.toHaveBeenCalled();
        });

        it('lazily creates an audio pool for a sound when play is called and the pool is missing', async () => {
            // Start with empty pools to trigger lazy creation
            vi.spyOn(soundUtilsModule, 'buildInitialPools').mockReturnValue({});
            const createAudioElementSpy = vi.spyOn(soundUtilsModule, 'createAudioElement');

            const { getByTestId } = await renderSoundProvider();

            expect(createAudioElementSpy).not.toHaveBeenCalled();

            const playButton = getByTestId('play-default-sound-button');
            await playButton.click();

            expect(createAudioElementSpy).toHaveBeenCalledTimes(POOL_SIZE);
            expect(createAudioElementSpy).toHaveBeenCalledWith(SOUND_FILE_MAP[defaultSoundName]);
        });

        it('does not call createAudioElement when sounds are disabled', async () => {
            // Start with empty pools to track createAudioElement calls
            vi.spyOn(soundUtilsModule, 'buildInitialPools').mockReturnValue({});
            const createAudioElementSpy = vi.spyOn(soundUtilsModule, 'createAudioElement');

            const { getByTestId } = await renderSoundProvider();

            const disableButton = getByTestId('disable-sound-button');
            await disableButton.click();

            const playButton = getByTestId('play-default-sound-button');
            await playButton.click();

            expect(createAudioElementSpy).not.toHaveBeenCalled();
        });

        it('sets currentTime, volume, and playbackRate on the audio element before playing', async () => {
            // Create a mock pool with one audio element
            const mockElement = createMockAudioElement();
            vi.spyOn(soundUtilsModule, 'buildInitialPools').mockReturnValue({
                [defaultSoundName]: {
                    elements: [mockElement as unknown as HTMLAudioElement],
                    src: SOUND_FILE_MAP[defaultSoundName],
                },
            });

            const { getByTestId } = await renderSoundProvider();
            const playButton = getByTestId('play-default-sound-button');
            const setVolumeButton = getByTestId('set-volume-half-button');

            await setVolumeButton.click();
            await playButton.click();

            expect(mockElement.currentTime).toBe(0);
            expect(mockElement.volume).toBe(0.5);
            expect(mockElement.playbackRate).toBe(1);
            expect(mockElement.play).toHaveBeenCalledOnce();
        });

        it('uses a custom playbackRate from options when provided', async () => {
            // Create a mock pool with one audio element for capture sound
            const mockElement = createMockAudioElement();
            vi.spyOn(soundUtilsModule, 'buildInitialPools').mockReturnValue({
                capture: {
                    elements: [mockElement as unknown as HTMLAudioElement],
                    src: SOUND_FILE_MAP.capture,
                },
            });

            const { getByTestId } = await renderSoundProvider();
            const playWithOptionsButton = getByTestId('play-with-options-button');

            await playWithOptionsButton.click();

            expect(mockElement.playbackRate).toBe(2);
            expect(mockElement.play).toHaveBeenCalledOnce();
        });

        it('swallows errors when the audio play() promise rejects', async () => {
            // Create a mock pool with one audio element that rejects
            const mockElement = createMockAudioElement();
            mockElement.play.mockRejectedValue(new Error('Playback failed'));

            vi.spyOn(soundUtilsModule, 'buildInitialPools').mockReturnValue({
                [defaultSoundName]: {
                    elements: [mockElement as unknown as HTMLAudioElement],
                    src: SOUND_FILE_MAP[defaultSoundName],
                },
            });

            const { getByTestId } = await renderSoundProvider();
            const playButton = getByTestId('play-default-sound-button');

            // Should not throw despite the play() promise rejecting
            await expect(playButton.click()).resolves.toBeUndefined();
            expect(mockElement.play).toHaveBeenCalledOnce();
        });

        it('creates a new audio element when all pool elements are busy playing', async () => {
            // Create a mock pool with two audio elements that are both busy playing
            const mockElement1 = createMockAudioElement();
            mockElement1.paused = false;
            mockElement1.ended = false;

            const mockElement2 = createMockAudioElement();
            mockElement2.paused = false;
            mockElement2.ended = false;

            const pool = {
                elements: [mockElement1 as unknown as HTMLAudioElement, mockElement2 as unknown as HTMLAudioElement],
                src: SOUND_FILE_MAP[defaultSoundName],
            };

            vi.spyOn(soundUtilsModule, 'buildInitialPools').mockReturnValue({
                [defaultSoundName]: pool,
            });

            const createAudioElementSpy = vi.spyOn(soundUtilsModule, 'createAudioElement');

            const { getByTestId } = await renderSoundProvider();
            const playButton = getByTestId('play-default-sound-button');

            // Verify initial pool size
            expect(pool.elements).toHaveLength(2);

            await playButton.click();

            // Should create a new audio element
            expect(createAudioElementSpy).toHaveBeenCalledWith(SOUND_FILE_MAP[defaultSoundName]);

            // Should add the new element to the pool
            expect(pool.elements).toHaveLength(3);

            // The new element should be played
            const newElement = pool.elements[2];
            expect(newElement.play).toHaveBeenCalledOnce();
        });
    });
});

describe('useSound', () => {
    it('provides context values when used inside SoundProvider', async () => {
        const { getByTestId } = await renderSoundProvider();

        const enabled = getByTestId('enabled');
        const volume = getByTestId('volume');

        await expect.element(enabled).toHaveTextContent('true');
        await expect.element(volume).toHaveTextContent(String(DEFAULT_VOLUME));
    });

    it('throws an error when used outside SoundProvider', async () => {
        // Suppress the expected error from appearing in the console
        vi.spyOn(console, 'error').mockImplementation(() => {});

        await expect(async () => {
            await render(<SoundConsumer />);
        }).rejects.toThrow('useSound must be used within a SoundProvider');

        vi.mocked(console.error).mockRestore();
    });
});
