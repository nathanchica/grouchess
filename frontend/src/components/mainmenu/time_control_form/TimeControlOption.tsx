type Props = {
    isSelected: boolean;
    onSelect: () => void;
    ariaLabel: string;
    displayText: string;
    optionValue: string;
};

function TimeControlOption({ isSelected, onSelect, ariaLabel, displayText, optionValue }: Props) {
    return (
        <label
            className={`cursor-pointer gap-1 rounded-2xl border px-5 py-4 transition focus-within:outline focus-within:outline-offset-2 focus-within:outline-emerald-400 ${
                isSelected
                    ? 'border-emerald-400 bg-emerald-400/10'
                    : 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-300/60 hover:bg-emerald-400/10'
            }`}
        >
            <input
                type="radio"
                name="time-control"
                value={optionValue}
                checked={isSelected}
                onChange={onSelect}
                className="sr-only"
                aria-label={ariaLabel}
            />
            <span aria-hidden="true" className="text-base font-semibold text-zinc-100">
                {displayText}
            </span>
        </label>
    );
}

export default TimeControlOption;
