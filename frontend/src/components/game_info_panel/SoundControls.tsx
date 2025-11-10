import { useSound } from '../../providers/SoundProvider';

function SoundControls() {
    const { enabled, toggleEnabled, volume, setVolume } = useSound();
    const displayVolume = Math.round(volume * 100);

    return (
        <section className="flex flex-col gap-2" aria-label="Sound settings">
            <div className="flex items-center justify-between gap-4">
                <span className="text-xs uppercase tracking-wide text-zinc-400">Sound Effects</span>
                <button
                    type="button"
                    onClick={toggleEnabled}
                    aria-pressed={enabled}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors cursor-pointer ${
                        enabled
                            ? 'bg-indigo-500/20 text-indigo-100 border-indigo-400/60 hover:bg-indigo-400/30'
                            : 'bg-zinc-700 text-zinc-400 border-zinc-600 hover:bg-zinc-700/70'
                    }`}
                    aria-label="Toggle sound effects"
                >
                    {enabled ? 'On' : 'Off'}
                </button>
            </div>

            <input
                type="range"
                min={0}
                max={100}
                value={displayVolume}
                aria-label="Sound effect volume"
                aria-valuetext={enabled ? `${displayVolume}%` : 'Muted'}
                onChange={(event) => {
                    setVolume(event.currentTarget.valueAsNumber / 100);
                }}
                className="w-full accent-indigo-400 disabled:opacity-40 cursor-pointer"
                disabled={!enabled}
            />
        </section>
    );
}

export default SoundControls;
