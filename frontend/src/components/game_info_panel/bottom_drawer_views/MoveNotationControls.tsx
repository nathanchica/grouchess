import { useStoredSettings } from '../../../providers/StoredSettingsProvider';

type NotationOptionButtonProps = {
    label: string;
    isSelected: boolean;
    onClick: () => void;
};

function NotationOptionButton({ label, isSelected, onClick }: NotationOptionButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={isSelected}
            className={`text-xs px-3 py-1 rounded transition-all cursor-pointer ${
                isSelected
                    ? 'bg-zinc-700 text-indigo-100 shadow-sm border border-zinc-600'
                    : 'text-zinc-400 border border-transparent hover:text-zinc-300'
            }`}
        >
            {label}
        </button>
    );
}

function MoveNotationControls() {
    const { moveNotationStyle, setSetting } = useStoredSettings();

    return (
        <div className="flex lg:flex-row flex-col lg:items-center items-start justify-between lg:gap-4 gap-2">
            <span className="2xl:text-sm text-xs text-zinc-200">Notation Style</span>
            <div
                className="flex md:flex-row flex-col bg-zinc-900/30 rounded p-0.5 border border-zinc-700/50"
                role="group"
                aria-label="Move notation style"
            >
                <NotationOptionButton
                    label="Figurine"
                    isSelected={moveNotationStyle === 'figurine'}
                    onClick={() => setSetting('moveNotationStyle', 'figurine')}
                />
                <NotationOptionButton
                    label="Text"
                    isSelected={moveNotationStyle === 'san'}
                    onClick={() => setSetting('moveNotationStyle', 'san')}
                />
            </div>
        </div>
    );
}

export default MoveNotationControls;
