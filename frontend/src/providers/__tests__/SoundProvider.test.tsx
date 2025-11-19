import { type ReactNode } from 'react';

import { render } from 'vitest-browser-react';

import * as soundUtilsModule from '../../utils/sounds';
import SoundProvider, { useSound } from '../SoundProvider';
import { POOL_SIZE, SOUND_FILE_MAP, type SoundName } from '../SoundProvider.schema';
import { StoredSettingsContext } from '../StoredSettingsProvider';
import { createMockStoredSettingsContextValues } from '../__mocks__/StoredSettingsProvider';

// Browser mode limitation: https://vitest.dev/guide/browser/#spying-on-module-exports
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
    initialStoredSettingsContextValues?: ReturnType<typeof createMockStoredSettingsContextValues>;
};

async function renderSoundProvider({
    children = <SoundConsumer />,
    initialStoredSettingsContextValues = createMockStoredSettingsContextValues(),
}: RenderSoundProviderOptions = {}) {
    function buildSoundProvider(storedSettingsContextValues: ReturnType<typeof createMockStoredSettingsContextValues>) {
        return (
            <StoredSettingsContext.Provider value={storedSettingsContextValues}>
                <SoundProvider>{children}</SoundProvider>
            </StoredSettingsContext.Provider>
        );
    }

    const renderResult = await render(buildSoundProvider(initialStoredSettingsContextValues));

    const rerenderSoundProvider = async (
        nextStoredSettingsContextValues: ReturnType<typeof createMockStoredSettingsContextValues>
    ) => {
        await renderResult.rerender(buildSoundProvider(nextStoredSettingsContextValues));
    };

    return {
        ...renderResult,
        rerenderSoundProvider,
    };
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

        vi.spyOn(soundUtilsModule, 'buildInitialPools').mockReturnValue({});
        vi.spyOn(soundUtilsModule, 'createAudioElement').mockImplementation(() =>
            (createMockAudioElement as unknown as () => HTMLAudioElement)()
        );
        vi.spyOn(soundUtilsModule, 'clampVolume').mockImplementation((value) => {
            if (Number.isNaN(value)) return 0.5;
            return Math.min(1, Math.max(0, value));
        });
    });

    describe('initialization from StoredSettingsProvider', () => {
        it('uses default settings from StoredSettingsProvider context', async () => {
            const initialStoredSettingsContextValues = createMockStoredSettingsContextValues();
            initialStoredSettingsContextValues.soundsEnabled = true;
            initialStoredSettingsContextValues.soundsVolume = 0.5;

            const { getByTestId } = await renderSoundProvider({ initialStoredSettingsContextValues });

            const enabled = getByTestId('enabled');
            const volume = getByTestId('volume');

            await expect.element(enabled).toHaveTextContent('true');
            await expect.element(volume).toHaveTextContent('0.5');
        });

        it('uses custom settings from StoredSettingsProvider context', async () => {
            const initialStoredSettingsContextValues = createMockStoredSettingsContextValues();
            initialStoredSettingsContextValues.soundsEnabled = false;
            initialStoredSettingsContextValues.soundsVolume = 0.8;

            const { getByTestId } = await renderSoundProvider({ initialStoredSettingsContextValues });

            const enabled = getByTestId('enabled');
            const volume = getByTestId('volume');

            await expect.element(enabled).toHaveTextContent('false');
            await expect.element(volume).toHaveTextContent('0.8');
        });
    });

    describe('integration with StoredSettingsProvider', () => {
        it('calls setSetting when enabled changes', async () => {
            const initialStoredSettingsContextValues = createMockStoredSettingsContextValues();
            const setSettingSpy = vi.fn();
            initialStoredSettingsContextValues.setSetting = setSettingSpy;

            const { getByTestId } = await renderSoundProvider({ initialStoredSettingsContextValues });

            // Change enabled to false
            const disableButton = getByTestId('disable-sound-button');
            await disableButton.click();

            expect(setSettingSpy).toHaveBeenCalledWith('soundsEnabled', false);

            setSettingSpy.mockClear();

            // Change enabled to true
            const enableButton = getByTestId('enable-sound-button');
            await enableButton.click();

            expect(setSettingSpy).toHaveBeenCalledWith('soundsEnabled', true);
        });

        it('calls setSetting when volume changes', async () => {
            const initialStoredSettingsContextValues = createMockStoredSettingsContextValues();
            const setSettingSpy = vi.fn();
            initialStoredSettingsContextValues.setSetting = setSettingSpy;

            const { getByTestId } = await renderSoundProvider({ initialStoredSettingsContextValues });

            const setVolumeButton = getByTestId('set-volume-half-button');
            await setVolumeButton.click();

            expect(setSettingSpy).toHaveBeenCalledWith('soundsVolume', 0.5);
        });

        it('clamps volume values before calling setSetting', async () => {
            const initialStoredSettingsContextValues = createMockStoredSettingsContextValues();
            const setSettingSpy = vi.fn();
            initialStoredSettingsContextValues.setSetting = setSettingSpy;

            const { getByTestId } = await renderSoundProvider({ initialStoredSettingsContextValues });

            // Test with volume > 1
            const setVolumeFullButton = getByTestId('set-volume-full-button');
            await setVolumeFullButton.click();

            expect(setSettingSpy).toHaveBeenCalledWith('soundsVolume', 1);

            setSettingSpy.mockClear();

            // Test with volume = 0
            const setVolumeZeroButton = getByTestId('set-volume-zero-button');
            await setVolumeZeroButton.click();

            expect(setSettingSpy).toHaveBeenCalledWith('soundsVolume', 0);
        });
    });

    describe('enabled and volume controls', () => {
        it('provides initial enabled and volume values via context', async () => {
            const initialStoredSettingsContextValues = createMockStoredSettingsContextValues();
            initialStoredSettingsContextValues.soundsEnabled = true;
            initialStoredSettingsContextValues.soundsVolume = 0.7;

            const { getByTestId } = await renderSoundProvider({ initialStoredSettingsContextValues });

            const enabled = getByTestId('enabled');
            const volume = getByTestId('volume');

            await expect.element(enabled).toHaveTextContent('true');
            await expect.element(volume).toHaveTextContent('0.7');
        });

        it('updates enabled when setEnabled is called and context changes', async () => {
            const initialStoredSettingsContextValues = createMockStoredSettingsContextValues();
            initialStoredSettingsContextValues.soundsEnabled = true;

            const { getByTestId, rerenderSoundProvider } = await renderSoundProvider({
                initialStoredSettingsContextValues,
            });

            const enabled = getByTestId('enabled');
            const disableButton = getByTestId('disable-sound-button');
            const enableButton = getByTestId('enable-sound-button');

            await expect.element(enabled).toHaveTextContent('true');

            // Simulate disabling sound
            const disabledContextValues = createMockStoredSettingsContextValues();
            disabledContextValues.soundsEnabled = false;
            await disableButton.click();
            await rerenderSoundProvider(disabledContextValues);
            await expect.element(enabled).toHaveTextContent('false');

            // Simulate enabling sound
            const enabledContextValues = createMockStoredSettingsContextValues();
            enabledContextValues.soundsEnabled = true;
            await enableButton.click();
            await rerenderSoundProvider(enabledContextValues);
            await expect.element(enabled).toHaveTextContent('true');
        });

        it('toggles enabled flag when toggleEnabled is called and context changes', async () => {
            const initialStoredSettingsContextValues = createMockStoredSettingsContextValues();
            initialStoredSettingsContextValues.soundsEnabled = true;

            const { getByTestId, rerenderSoundProvider } = await renderSoundProvider({
                initialStoredSettingsContextValues,
            });

            const enabled = getByTestId('enabled');
            const toggleButton = getByTestId('toggle-sound-button');

            await expect.element(enabled).toHaveTextContent('true');

            // First toggle: disable
            const disabledContextValues = createMockStoredSettingsContextValues();
            disabledContextValues.soundsEnabled = false;
            await toggleButton.click();
            await rerenderSoundProvider(disabledContextValues);
            await expect.element(enabled).toHaveTextContent('false');

            // Second toggle: enable
            const enabledContextValues = createMockStoredSettingsContextValues();
            enabledContextValues.soundsEnabled = true;
            await toggleButton.click();
            await rerenderSoundProvider(enabledContextValues);
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
            const initialStoredSettingsContextValues = createMockStoredSettingsContextValues();
            const { rerenderSoundProvider } = await renderSoundProvider({
                initialStoredSettingsContextValues,
                children: <SoundConsumer />,
            });

            expect(buildInitialPoolsSpy).toHaveBeenCalledOnce();

            buildInitialPoolsSpy.mockClear();

            await rerenderSoundProvider(initialStoredSettingsContextValues);

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

            const initialStoredSettingsContextValues = createMockStoredSettingsContextValues();
            initialStoredSettingsContextValues.soundsEnabled = true;

            const { getByTestId, rerenderSoundProvider } = await renderSoundProvider({
                initialStoredSettingsContextValues,
            });

            // Clear spy after mount to only track calls during play
            createAudioElementSpy.mockClear();

            // Disable sounds
            const disabledContextValues = createMockStoredSettingsContextValues();
            disabledContextValues.soundsEnabled = false;
            const disableButton = getByTestId('disable-sound-button');
            await disableButton.click();
            await rerenderSoundProvider(disabledContextValues);

            // Try to play with sounds disabled
            const playButton = getByTestId('play-default-sound-button');
            await playButton.click();

            // createAudioElement should not be called since sounds are disabled
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
        const initialStoredSettingsContextValues = createMockStoredSettingsContextValues();
        initialStoredSettingsContextValues.soundsEnabled = true;
        initialStoredSettingsContextValues.soundsVolume = 0.5;

        const { getByTestId } = await renderSoundProvider({ initialStoredSettingsContextValues });

        const enabled = getByTestId('enabled');
        const volume = getByTestId('volume');

        await expect.element(enabled).toHaveTextContent('true');
        await expect.element(volume).toHaveTextContent('0.5');
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
