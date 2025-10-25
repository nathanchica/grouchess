import { useState, type ChangeEvent } from 'react';

// Alphanumeric characters and spaces, max length 20
const VALID_PATTERN = /^[a-z0-9 ]{0,20}$/i;
const MAX_DISPLAY_NAME_LENGTH = 20;

const DEFAULT_LABEL_CLASSNAME = 'text-lg sm:text-xl font-medium text-zinc-100';

type Props = {
    labelClassName?: string;
    onDisplayNameChange: (name: string) => void;
};

function DisplayNameForm({ labelClassName = DEFAULT_LABEL_CLASSNAME, onDisplayNameChange }: Props) {
    const [displayName, setDisplayName] = useState('');

    const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target;
        if (VALID_PATTERN.test(value)) {
            setDisplayName(value);
            onDisplayNameChange(value);
        }
    };

    return (
        <form className="flex flex-col gap-4">
            <label htmlFor="display-name" className={labelClassName}>
                Display Name (optional)
            </label>
            <div className="flex flex-col gap-2">
                <input
                    id="display-name"
                    type="text"
                    placeholder="Enter your display name"
                    className="w-full rounded-md border border-zinc-700 bg-zinc-900/50 px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    value={displayName}
                    maxLength={MAX_DISPLAY_NAME_LENGTH}
                    onChange={handleInputChange}
                />
                {displayName.length > 0 && (
                    <p className="text-xs text-zinc-500">
                        {displayName.length}/{MAX_DISPLAY_NAME_LENGTH} characters. Alphanumeric characters and spaces
                        only.
                    </p>
                )}
            </div>
        </form>
    );
}

export default DisplayNameForm;
